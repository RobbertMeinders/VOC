// Mobiel Safari: bij elastic overscroll (rubber-banding boven-/onderaan)
// schemert even het echte <html>/<body> door. globals.css lost dit al
// grotendeels op voor <body> (body:has([data-theme="light"]) { background:
// #f5f3ef }, met dezelfde toelichting over ditzelfde Safari-gedrag), maar
// dekt <html> zelf niet -- bij de rubber-band buiten body's eigen hoogte om
// kon <html>'s (systeemthema-volgende) achtergrond alsnog even doorschijnen.
// Zelfde kleurtoken (#f5f3ef, het lichte --background) i.p.v. puur wit,
// zodat dit vangnet ook kleurmatig bij de rest van de portaalstijl past.
export function EmbedWhiteBackground() {
  return <style>{"html, body { background: #f5f3ef; }"}</style>;
}
