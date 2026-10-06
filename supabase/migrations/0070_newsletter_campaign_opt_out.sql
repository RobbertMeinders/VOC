-- Opt-out voor campagnes (Telecommunicatiewet art. 11.7 / AVG recht van
-- bezwaar): tot nu toe kreeg elk actief lid elke campagne, zonder enige
-- voorkeursmogelijkheid — de bestaande e-mailvoorkeuren op /instellingen
-- gaan alleen over de 12 getriggerde notificatietypes (nieuwe activiteit,
-- reacties, …), niet over deze losse verzendflow (sendNewsletterAction /
-- 0067_newsletter_send.sql).
alter table public.profiles add column email_campaigns boolean not null default true;

-- claim_newsletter_recipients filtert nu ook op deze voorkeur. Geen OUT-
-- parameterwijziging, dus create or replace volstaat hier (in tegenstelling
-- tot de drop-vereiste gevallen in 0067).
create or replace function public.claim_newsletter_recipients(p_communication_id uuid)
returns table (notification_id uuid, profile_id uuid, email text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_board() or auth.role() = 'service_role') then
    raise exception 'not authorized';
  end if;

  insert into public.notifications (profile_id, type, title, communication_id, channel_push_allowed, channel_email_allowed)
  select p.id, 'newsletter', c.subject, c.id, false, false
  from public.profiles p
  cross join public.communications c
  where c.id = p_communication_id
    and p.is_active
    and p.email_campaigns
  on conflict (communication_id, profile_id) where communication_id is not null do nothing;

  update public.communications
  set total_recipients = (select count(*) from public.notifications where communication_id = p_communication_id)
  where id = p_communication_id and total_recipients is null;

  return query
  select n.id, n.profile_id, p.email
  from public.notifications n
  join public.profiles p on p.id = n.profile_id
  where n.communication_id = p_communication_id
    and n.emailed_at is null;
end;
$$;
