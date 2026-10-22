-- Lidmaatschap-traject Deel 3: privacy-defaults. Tot nu toe stonden
-- bezoekersadres (companies.show_address) en persoonlijke e-mail/telefoon
-- (profiles.show_email/show_phone) standaard AAN (0006/0036) -- vanaf nu
-- staan ze standaard UIT, zowel voor nieuwe rijen als (expliciet gevraagd)
-- voor alle BESTAANDE bedrijven/leden. Het bestuur blijft via is_board()
-- alles zien (get_member_profile/companies_for_members maskeren toch al
-- niet voor bestuur/beheer) -- dat gedrag verandert hier niet, alleen de
-- default/bestaande waarde van het schuifje zelf. Bedrijfs-e-mail/telefoon
-- (de zakelijke contactgegevens van companies zelf) blijven ongemoeid --
-- die vallen hier niet onder, dat is geen persoonsgegeven van een lid.
alter table public.profiles
  alter column show_email set default false,
  alter column show_phone set default false;

alter table public.companies
  alter column show_address set default false;

update public.profiles set show_email = false, show_phone = false;
update public.companies set show_address = false;

-- "Gezien"-vlag per nieuwe prompt, een EIGEN kolom per prompt-type i.p.v.
-- een bestaande dismissed_at hergebruiken -- zelfde reden als
-- introduction_prompt_dismissed_at (0110): bestaande leden/bedrijven hebben
-- een generieke vlag vaak al lang geleden gezet, waardoor deze nieuwe
-- prompt anders nooit zou verschijnen. De kaart-prompt (zichtbaar wanneer
-- het bezoekersadres verborgen staat) hergebruikt bewust dezelfde
-- adres-vlag als de instellingen-prompt: beide gaan over precies dezelfde
-- onderliggende schakelaar, en wie daar al "niet nu" op zei wil 'm
-- vermoedelijk ook niet op de kaart nogmaals voorgelegd krijgen.
alter table public.profiles
  add column if not exists contact_visibility_prompt_dismissed_at timestamptz;

alter table public.companies
  add column if not exists address_visibility_prompt_dismissed_at timestamptz;

-- Additieve kolom-grants (0091/0139/0145 hebben dit patroon al eerder zo
-- uitgebreid, zonder de volledige eerdere lijst te herhalen -- GRANT SELECT
-- (kolom) voegt toe aan bestaande kolomrechten, het vervangt ze niet).
grant select (contact_visibility_prompt_dismissed_at) on public.profiles to authenticated, anon;
grant select (address_visibility_prompt_dismissed_at) on public.companies to authenticated, anon;

-- Zelfde smalle aanpak als set_company_show_address (0036): companies_board_update
-- staat een gewoon lid geen UPDATE op companies toe, dus de "gezien"-vlag
-- voor de adresprompt gaat via zijn eigen, tot deze ene kolom beperkte
-- security-definer-functie i.p.v. de RLS-policy te verruimen.
create or replace function public.dismiss_company_address_prompt(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_board()
    or exists (
      select 1 from public.company_members
      where company_id = p_company_id and profile_id = auth.uid()
    )
  ) then
    raise exception 'not authorized';
  end if;

  update public.companies set address_visibility_prompt_dismissed_at = now() where id = p_company_id;
end;
$$;

grant execute on function public.dismiss_company_address_prompt(uuid) to authenticated;
