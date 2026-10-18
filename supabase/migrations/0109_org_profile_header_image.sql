-- Optionele headerfoto bovenaan "Over de vereniging" (/vereniging/over-ons) —
-- bestuur vroeg hier zelf een foto te kunnen plaatsen i.p.v. alleen tekst.
-- Zelfde news-images-bucket als nieuwsartikelen (0064_news_items.sql): die
-- RLS-policy's checken alleen bucket_id + is_board(), niet een specifiek
-- pad, dus geen nieuwe bucket/policy's nodig voor een extra map hierin.
alter table public.org_profile
  add column header_image_path text;
