// Mobiel Safari: bij elastic overscroll (rubber-banding boven-/onderaan)
// schemert even het echte <html>/<body> door. globals.css lost dit al
// grotendeels op voor <body> (body:has([data-theme="light"]) { background:
// #ffffff }, met dezelfde toelichting over ditzelfde Safari-gedrag), maar
// dekt <html> zelf niet -- bij de rubber-band buiten body's eigen hoogte om
// kon <html>'s (systeemthema-volgende) achtergrond alsnog even doorschijnen.
// Live feedback: alle embeds moeten zuiver wit zijn, niet de zandtint van de
// rest van het portaal -- dus bewust #ffffff, geen themakleur.
export function EmbedWhiteBackground() {
  return <style>{"html, body { background: #ffffff; }"}</style>;
}
