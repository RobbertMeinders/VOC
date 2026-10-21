-- Beveiligingsfixlijst Blok 3, M5: een SVG kan een ingebed <script> of
-- event-handler bevatten. uploadImage() (upload.ts) strip(te) bekende
-- scriptvectoren via een regex-based sanitizer voordat het bestand wordt
-- opgeslagen, maar dat is defense-in-depth, geen garantie tegen elke
-- denkbare SVG-truc (foreignObject-varianten, CSS-gebaseerde constructies,
-- …) — voor avatars/bedrijfslogo's (door leden zelf te uploaden, dus de
-- minst vertrouwde content van alle SVG-uploads in deze app) is uitsluiten
-- veiliger dan proberen te saniteren. company-logos is de enige van de
-- twee buckets die SVG ooit toestond (avatars deed dat al nooit).
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'company-logos';
