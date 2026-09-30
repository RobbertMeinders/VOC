-- Security-audit bevindingen #5 en #9 (gemiddeld, 2026-09-30).

-- #5: log_push_unsubscribed (0042_events_and_statistics.sql) verwijderde elk
-- endpoint dat werd meegegeven, zonder te checken of de aanroeper daar
-- eigenaar van is, en schreef een door de aanroeper vrij op te geven
-- p_profile_id rechtstreeks in de gebeurtenissenlog. Een ingelogd lid dat
-- een andermans push-endpoint kent/raadt kon zo diens abonnement laten
-- verwijderen én een vervalste profile_id in de log zetten. Nu: de echte
-- eigenaar wordt opgezocht in de rij zelf (nooit uit het argument
-- vertrouwd), en alleen de eigenaar zelf óf een service-role-context
-- zonder auth.uid() (de cron, die dode abonnementen van willekeurige leden
-- mag opruimen) mag de rij daadwerkelijk verwijderen.
create or replace function public.log_push_unsubscribed(p_endpoint text, p_profile_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
begin
  select profile_id into v_owner_id from public.push_subscriptions where endpoint = p_endpoint;

  if auth.uid() is not null and v_owner_id is not null and v_owner_id <> auth.uid() then
    return;
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.events (event_type, profile_id, target_type, metadata)
  values ('push_unsubscribed', coalesce(v_owner_id, p_profile_id, auth.uid()), 'push_subscription', jsonb_build_object('endpoint', p_endpoint));
end;
$$;

-- #9: handle_new_user (0001_init.sql) controleerde nooit dat het e-mailadres
-- waarmee iemand zich daadwerkelijk registreert, overeenkomt met
-- invitations.email — wie een geldige, nog-niet-gebruikte uitnodigingslink
-- had (gelekt via een doorgestuurde mail, gedeeld scherm, browsergeschiedenis
-- op een gedeeld apparaat, …) kon zich daarmee registreren onder een zelf
-- gekozen e-mailadres, met de rol die de uitnodiging meegeeft. Dit was geen
-- privilege-escalatie (rol komt nog steeds uit de uitnodiging, niet van de
-- client) en geen account-overname (registratie maakt altijd een nieuwe
-- rij aan), maar wel "de verkeerde persoon wordt lid via jouw uitnodiging".
-- Alleen afgedwongen wanneer invitations.email is ingevuld — de bestaande,
-- bewust ondersteunde generieke/e-mailloze uitnodigingslink (zonder
-- vooringevuld adres) blijft daarom ongewijzigd werken.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := new.raw_user_meta_data;
  v_token text := v_meta ->> 'invitation_token';
  v_invitation public.invitations;
  v_company_id uuid := nullif(v_meta ->> 'company_id', '')::uuid;
  v_new_company_name text := v_meta ->> 'new_company_name';
  v_created_company_id uuid;
begin
  if v_token is null then
    raise exception 'Registratie vereist een geldige uitnodiging.';
  end if;

  select * into v_invitation
    from public.invitations
    where token = v_token
    for update;

  if v_invitation is null
     or v_invitation.status <> 'pending'
     or v_invitation.expires_at < now()
  then
    raise exception 'Deze uitnodiging is ongeldig of verlopen.';
  end if;

  if v_invitation.email is not null and lower(v_invitation.email) <> lower(new.email) then
    raise exception 'Dit e-mailadres komt niet overeen met de uitnodiging.';
  end if;

  insert into public.profiles (id, first_name, last_name, email, phone, job_title, role)
  values (
    new.id,
    coalesce(v_meta ->> 'first_name', ''),
    coalesce(v_meta ->> 'last_name', ''),
    new.email,
    v_meta ->> 'phone',
    v_meta ->> 'job_title',
    v_invitation.role
  );

  if v_new_company_name is not null and v_new_company_name <> '' then
    insert into public.companies (name, slug, industry, website, city)
    values (
      v_new_company_name,
      lower(regexp_replace(v_new_company_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(new.id::text, 1, 8),
      v_meta ->> 'new_company_industry',
      v_meta ->> 'new_company_website',
      v_meta ->> 'new_company_city'
    )
    returning id into v_created_company_id;

    insert into public.company_members (company_id, profile_id) values (v_created_company_id, new.id);
  elsif v_company_id is not null then
    insert into public.company_members (company_id, profile_id) values (v_company_id, new.id);
  end if;

  update public.invitations
    set status = 'accepted', accepted_by = new.id, accepted_at = now()
    where id = v_invitation.id;

  return new;
end;
$$;

-- #8 (deel 2): anonymize_expired_profiles() nulde avatar_url op de rij,
-- maar het onderliggende bestand bleef permanent in de avatars-Storage-
-- bucket staan — en die bucket's publieke leesbeleid (is_public_employee(),
-- 0056_public_storage_rls_fix_and_avatars.sql) checkt niet of het profiel
-- nog actief is, dus een oude profielfoto van een allang geanonimiseerd lid
-- kon (als publicly_visible ooit true was) voor altijd publiek opvraagbaar
-- blijven. De functie geeft het oude avatar-pad nu mee terug, zodat de
-- aanroepende cron-route het bestand ook daadwerkelijk kan verwijderen.
-- Returns-type wijzigt, dus drop + recreate i.p.v. create or replace
-- (Postgres staat geen wijziging van het kolomtype van een bestaande
-- returns table toe) — de service-role-only rechten uit 0060 moeten
-- daarom hieronder opnieuw worden gezet.
drop function if exists public.anonymize_expired_profiles();

create function public.anonymize_expired_profiles()
returns table (profile_id uuid, old_avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with expired as (
    select id, avatar_url
    from public.profiles
    where is_active = false
      and deactivated_at is not null
      and deactivated_at <= now() - interval '90 days'
      and anonymized_at is null
    for update
  ),
  updated as (
    update public.profiles p
    set
      first_name = 'Verwijderd',
      last_name = 'lid',
      email = 'verwijderd-' || p.id || '@voc-ledenportaal.invalid',
      phone = null,
      job_title = null,
      bio = null,
      avatar_url = null,
      linkedin_url = null,
      anonymized_at = now()
    from expired
    where p.id = expired.id
    returning p.id
  )
  select expired.id, expired.avatar_url from expired;
end;
$$;

grant execute on function public.anonymize_expired_profiles() to service_role;

-- #8 (deel 3): is_public_employee() (0056_public_storage_rls_fix_and_avatars.sql)
-- — gebruikt door de avatars_public_select storage-policy — checkte nooit
-- of het profiel nog actief is, in tegenstelling tot get_public_company()
-- die hetzelfde wél doet. Zonder deze check bleef een oude, publiek
-- zichtbaar gemarkeerde profielfoto ook na deactivering/anonimisering via
-- de directe Storage-URL opvraagbaar voor anonieme bezoekers.
create or replace function public.is_public_employee(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.company_members cm on cm.profile_id = p.id
    join public.companies c on c.id = cm.company_id
    where p.id = p_profile_id
      and p.is_active = true
      and p.publicly_visible = true
      and c.is_publicly_visible = true
  );
$$;
