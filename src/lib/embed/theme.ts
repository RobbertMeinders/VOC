// UX-review E3: de /embed/*-pagina's zien er standaard uit als het portaal
// (Inter, pil-knoppen, grijze pagina-achtergrond) — herkenbaar anders dan
// vocveendam.nl zelf. ?thema=website laat een embed in plaats daarvan de
// look van de website aanhouden (Open Sans, hoekige knoppen, transparante
// achtergrond), zonder dat het portaal zelf ooit verandert: de standaard
// (geen parameter) blijft het huidige uiterlijk. Eén losse module i.p.v. per
// pagina een eigen check, zodat elke embed-pagina en elke interne link
// ertussen hetzelfde "onthoudt" welk thema actief is.
export function isWebsiteTheme(thema: string | undefined): boolean {
  return thema === "website";
}

// Voor interne links tussen embed-pagina's binnen dezelfde iframe (bv.
// "Terug naar agenda", of doorklikken naar een activiteit) — zonder dit
// viel het website-thema na één klik terug op het portaalthema.
export function withEmbedTheme(href: string, thema: string | undefined): string {
  if (!isWebsiteTheme(thema)) return href;
  return `${href}${href.includes("?") ? "&" : "?"}thema=website`;
}
