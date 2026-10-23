// Mobiel Safari: bij elastic overscroll (rubber-banding boven-/onderaan)
// schemert even het echte <html>/<body> door -- die volgen het systeem-
// thema (THEME_INIT_SCRIPT, lib/theme/constants.ts), niet de
// data-theme="light" die elke embed-pagina alleen op zijn eigen
// contentwrapper zet (<html>/<body> zijn van de hoofdlayout, buiten bereik
// van een embed-pagina). Bij een donker systeemthema flitste zo alsnog een
// donkere balk door. Voor nu gewoon vast wit i.p.v. de thema-token, zoals
// gevraagd -- geen permanente/definitieve stijlkeuze.
export function EmbedWhiteBackground() {
  return <style>{"html, body { background: #fff; }"}</style>;
}
