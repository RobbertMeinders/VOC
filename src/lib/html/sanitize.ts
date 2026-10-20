// Security-audit: VariableEditor (zie components/ui/VariableEditor.tsx)
// rendert e-mailsjabloon-HTML voortaan rechtstreeks in een contentEditable
// <div> op de echte beheerpagina — niet meer in een gesandboxte <iframe>
// zoals de vorige, los-van-elkaar-staande voorbeeldweergave deed. Zonder
// opschoning zou geplakte of al opgeslagen HTML met bv. een
// <img onerror=...>, <script> of een javascript:-link zich gewoon als
// script uitvoeren in de browser van elke beheerder die dit sjabloon
// opent — "self-XSS" voor die beheerder, maar wel met zijn/haar echte,
// ingelogde sessie. Dit is bewust een kleine, op dit ene gebruiksdoel
// toegespitste opschoner (eenvoudige e-mailtekst: alinea's, link,
// afbeelding, basisopmaak) i.p.v. een volwaardige HTML-sanitizer-library
// erbij te halen voor een handvol toegestane tags.

const DISALLOWED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "form",
  "svg",
  "math",
  "base",
  "title",
  "noscript",
  "video",
  "audio",
  "source",
]);

function hasUnsafeUrlScheme(value: string): boolean {
  // "   JaVaScRiPt : alert(1)" moet ook gevangen worden — niet alleen de
  // precieze schrijfwijze "javascript:" zonder omweg.
  const normalized = value.trim().toLowerCase().replace(/[\s\u0000-\u001f]/g, "");
  return normalized.startsWith("javascript:") || normalized.startsWith("vbscript:") || normalized.startsWith("data:text/html");
}

function sanitizeElement(el: Element): void {
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    // Event-handlers (onclick, onerror, onload, ...) zijn de directe
    // scriptuitvoering — die mogen nooit blijven staan, op geen enkel
    // element.
    if (name.startsWith("on")) {
      el.removeAttribute(attr.name);
      continue;
    }
    if ((name === "href" || name === "src" || name === "action" || name === "formaction") && hasUnsafeUrlScheme(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }
}

export function sanitizeEmailHtml(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;

  // Statische NodeList-snapshot nodig: removeChild tijdens het doorlopen
  // van een live querySelectorAll-resultaat slaat anders knopen over.
  Array.from(container.querySelectorAll(Array.from(DISALLOWED_TAGS).join(","))).forEach((el) => el.remove());

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
  const elements: Element[] = [];
  let node = walker.nextNode();
  while (node) {
    elements.push(node as Element);
    node = walker.nextNode();
  }
  elements.forEach(sanitizeElement);

  return container.innerHTML;
}
