-- Bulk-ledenimport: bestuur kan bestaande ledengegevens (naam, e-mail,
-- telefoon, functie, bedrijf) in één keer aanleveren als uitnodigingen,
-- zónder dat daar meteen een uitnodigingsmail bij hoort. De gegevens komen
-- op de uitnodiging zelf te staan (niet op een profiel — dat kan pas
-- bestaan met een bijbehorend auth.users-account) en worden gebruikt om het
-- registratieformulier voor in te vullen zodra iemand de link wel gebruikt,
-- of het bestuur alsnog op "verstuur" drukt.
--
-- Bulk-inserten in `invitations` zelf is hier veilig (geen trigger die
-- op basis van eerder-in-dezelfde-insert-zichtbare rijen reageert, zoals
-- notify_new_member op `profiles` doet) — deze route raakt `profiles` pas
-- op het moment dat iemand écht registreert, één voor één.

alter table public.invitations
  add column first_name text,
  add column last_name text,
  add column phone text,
  add column job_title text,
  add column company_id uuid references public.companies (id) on delete set null;

drop function if exists public.get_invitation_preview(text);

create function public.get_invitation_preview(p_token text)
returns table (
  valid boolean,
  role public.user_role,
  email text,
  first_name text,
  last_name text,
  phone text,
  job_title text,
  company_id uuid,
  company_name text,
  company_city text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (i.status = 'pending' and i.expires_at > now()) as valid,
    i.role,
    i.email,
    i.first_name,
    i.last_name,
    i.phone,
    i.job_title,
    i.company_id,
    c.name as company_name,
    c.city as company_city
  from public.invitations i
  left join public.companies c on c.id = i.company_id
  where i.token = p_token;
$$;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;
