-- Thumbnail voor feed-afbeeldingen, 1-op-1 gekoppeld aan de bijlage-rij zelf
-- (i.p.v. bv. een los veld op de post) — zo kan een thumbnail nooit aan de
-- verkeerde foto van een bericht met meerdere bijlagen komen te hangen.
-- Null voor nieuwe rijen totdat de upload 'm zet (PostComposer/
-- createPostAction), en voor bestaande rijen totdat de backfill-tool
-- (/beheer/thumbnails) ze alsnog vult.
alter table public.feed_attachments add column thumb_path text;
