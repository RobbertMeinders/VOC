-- Hardening-batch, vervolgronde (P1, bevestigd).

-- VOC-20: search_companies_for_signup doorzocht ALLE bedrijven, ook
-- prospect/opgezegd/oud-lid -- als anon aanroepbaar (nodig voor het
-- registratieformulier, zie ExistingCompanySearch) gaf een korte term als
-- anon dus elk bedrijf terug (id/naam/plaats), ook niet-publieke. Beperkt
-- tot actieve leden-bedrijven, zoals get_public_companies() ook al doet.
create or replace function public.search_companies_for_signup(p_query text)
returns table (id uuid, name text, city text)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, city
  from public.companies
  where p_query is not null and length(trim(p_query)) >= 2
    and name ilike '%' || trim(p_query) || '%'
    and membership_status = 'lid'
  order by name
  limit 10;
$$;

-- VOC-22: feed_posts.created_at had alleen een DEFAULT now(), geen guard
-- -- feed_posts_self_insert liet elk actief lid gewoon een expliciete
-- created_at meesturen, dus een verre datum in de toekomst zette een
-- bericht permanent bovenaan (ORDER BY created_at DESC overal in de feed).
create or replace function public.guard_feed_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  return new;
end;
$$;

create trigger feed_posts_guard_insert
  before insert on public.feed_posts
  for each row execute function public.guard_feed_post_insert();

revoke execute on function public.guard_feed_post_insert() from public;

-- VOC-01-uitbreiding: get_message_template was (net als get_email_template
-- vóór 0171) aan anon/authenticated gegrant zodat de inloglink-/reset-mail
-- ook vóór een sessie bestaat gerenderd kon worden -- met voorspelbare
-- sleutels ('uit-nieuw', 'magic', ...) kon iedereen zo rechtstreeks de
-- volledige inhoud van elk systeembericht opvragen. message-render.ts
-- gebruikt nu de service-role-client (altijd beschikbaar, draait sowieso
-- alleen server-side), dus de publieke grant kan vervallen.
revoke execute on function public.get_message_template(text) from anon, authenticated;

insert into public.schema_migration_log (version) values ('0203') on conflict (version) do nothing;
notify pgrst, 'reload schema';
