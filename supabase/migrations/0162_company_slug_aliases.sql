-- Bedrijfs-slugs krijgen door 0161/0163 een schone vorm (zie die migraties).
-- De publieke bedrijvengids-embed (/embed/bedrijven/[slug],
-- /api/embed/companies/[slug]) adresseert bedrijven al op slug, dus een al
-- extern gedeelde/ingebedde link naar de oude (lelijke) slug mag niet
-- breken. Zelfde aanpak als activity_slug_aliases (0155), met één verschil:
-- die tabel heeft geen anon-policy ("de publieke embed adresseert altijd op
-- het kale UUID"), maar bedrijven doen dat juist wel op slug — vandaar hier
-- een losse, smalle SECURITY DEFINER-functie i.p.v. een directe
-- SELECT-grant op de tabel, zodat zowel de ingelogde portaalkant als de
-- anonieme embed dezelfde resolutie kunnen gebruiken zonder de tabel zelf
-- breed te hoeven open zetten.
create table public.company_slug_aliases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index company_slug_aliases_company_id_idx on public.company_slug_aliases (company_id);

alter table public.company_slug_aliases enable row level security;
-- Bewust geen policies: deze tabel wordt alleen door migraties (als
-- tabel-eigenaar, buiten RLS om) en door de SECURITY DEFINER-functie
-- hieronder gelezen/geschreven — nooit rechtstreeks door app-code.

create function public.resolve_company_slug_alias(p_slug text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.slug
  from public.company_slug_aliases a
  join public.companies c on c.id = a.company_id
  where a.slug = p_slug
  limit 1;
$$;

grant execute on function public.resolve_company_slug_alias(text) to anon, authenticated;
