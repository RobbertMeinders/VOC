-- P2-hardening, batch 1.

-- Regressie van 0146 (Blok 2, M11): migratie 0172 (brede RLS-herschrijving
-- voor performance) draaide per ongeluk ook de ORIGINELE, lekke
-- feed_post_reports_author_or_board_delete-policy weer terug, naast de
-- door 0146 bedoelde feed_post_reports_board_delete. RLS-policy's zijn een
-- OR: met beide actief kon de auteur van een GERAPPORTEERD bericht zijn
-- eigen report-rij weer rechtstreeks verwijderen, buiten de bedoelde
-- delete_feed_post()-functie (die de cascade al los afhandelt) om. Alleen
-- de bedoelde policy blijft over.
drop policy if exists "feed_post_reports_author_or_board_delete" on public.feed_post_reports;

-- 0154: invitations_board_requires_email is NOT VALID gezet om een toen al
-- bestaande, legitieme historische rij niet te laten blokkeren. Deze
-- VALIDATE controleert nu alsnog alle rijen (ook de historische) en zet 'm
-- daarmee volledig actief. Faalt dit met een constraint-violation-foutmelding,
-- dan staat er nog een rij die niet voldoet -- meld dat terug, dan kijken we
-- samen of die rij gecorrigeerd moet worden.
alter table public.invitations
  validate constraint invitations_board_requires_email;

-- get_activity_interest_count (anon/authenticated-aanroepbaar, nodig voor
-- de openbare agenda-embed) telde voor ELK activity_id, ook een nog niet
-- goedgekeurde/niet-publieke activiteit -- een aanroeper die een pending
-- activity_id kende (bv. via een andere, los lek) kon zo de interesse
-- daarin aflezen voordat bestuur 'm ooit publiceert. Nu alleen een telling
-- voor activiteiten die al publiek zichtbaar zijn (zelfde voorwaarde als
-- activities_public_select).
create or replace function public.get_activity_interest_count(p_activity_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.activity_registrations where activity_id = p_activity_id)
    + (select count(*) from public.public_activity_registrations where activity_id = p_activity_id)
  where exists (
    select 1 from public.activities
    where id = p_activity_id and source = 'voc' and status in ('approved', 'cancelled')
  );
$$;

-- news-images stond (als enige na 0148) nog SVG toe -- alleen bestuur kan
-- uploaden, maar een SVG kan een ingebed <script> bevatten en wordt vanaf
-- het Supabase-domein geserveerd aan elk ingelogd lid dat het nieuwsbericht
-- bekijkt. Zelfde conclusie als 0148 voor company-logos: uitsluiten is
-- veiliger dan proberen te saniteren.
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/avif']
where id = 'news-images';

insert into public.schema_migration_log (version) values ('0205') on conflict (version) do nothing;
notify pgrst, 'reload schema';
