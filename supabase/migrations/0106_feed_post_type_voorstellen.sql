-- Berichten plaatsen vereenvoudigen: de composer laat een lid vooraf kiezen
-- wat voor bericht het is (incl. "ik wil mezelf voorstellen"), en zet
-- daarvoor automatisch een categorietag. 'voorstellen' is nieuw naast de
-- bestaande vraag/aanbod/nieuws/overig — geen bestaande data verandert,
-- en 'overig' blijft toegestaan zodat al zo-gelabelde berichten (vóór deze
-- wijziging geplaatst) geldig blijven, ook al is het voortaan geen
-- zelf-kiesbare optie meer in de composer.
alter table public.feed_posts drop constraint if exists feed_posts_type_check;
alter table public.feed_posts add constraint feed_posts_type_check
  check (type in ('vraag', 'aanbod', 'nieuws', 'overig', 'voorstellen'));
