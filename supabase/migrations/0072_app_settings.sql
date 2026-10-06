-- Eén instellingenrij voor de hele applicatie (naam, logo, verenigingsnaam)
-- i.p.v. deze als losse, verspreide stukken hardcoded tekst in de code —
-- voortaan door een beheerder zelf aan te passen op /beheer/instellingen,
-- zonder dat daar een code-wijziging voor nodig is. "id boolean primary key
-- default true check (id)" is de gangbare Postgres-singleton-truc: er kan
-- nooit meer dan één rij bestaan (een tweede insert met id=true botst op de
-- primary key, en id=false faalt op de check).
create table public.app_settings (
  id boolean primary key default true,
  constraint app_settings_singleton check (id),
  -- Naam van de applicatie zelf — browsertab-titel, PWA-appnaam, manifest.
  site_name text not null default 'VOC Ledenportaal',
  -- Volledige naam van de vereniging — gebruikt in de nieuwsbrief-voettekst
  -- en de voorkeuren-regel onder automatische notificatiemails (zie
  -- src/lib/newsletter/render.ts / src/lib/email/send.ts), i.p.v. een
  -- hardcoded "Veendammer Ondernemers Compagnie" (die trouwens op drie
  -- plekken in de code allemaal net iets anders gespeld was).
  org_name text not null default 'Veendammer Ondernemers Compagnie',
  -- Publieke URL naar een eigen logo-afbeelding; null = terugval op het
  -- vaste /brand/voc-logo-mark.png-bestand.
  logo_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;

-- Publiek leesbaar (geen gevoelige data — naam/logo zijn sowieso al overal
-- zichtbaar) zodat ook niet-ingelogde pagina's (login, embeds) hetzelfde
-- kunnen tonen zonder een aparte admin-client nodig te hebben. Wijzigen
-- blijft wél beheerder-only.
create policy "app_settings_public_select" on public.app_settings
  for select using (true);
create policy "app_settings_admin_update" on public.app_settings
  for update using (public.is_admin());

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();
