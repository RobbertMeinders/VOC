// VOC Ledenportaal — gehoste embed-loader.
//
// Vervangt de vorige opzet (een los stuk <iframe> + een complete kopie van
// deze logica als inline <script> per WordPress-pagina, zie Beheer ->
// Embed-codes). Elke pagina plakte zijn eigen kopie, dus een verbetering
// hier betekende alle WordPress-pagina's opnieuw bijwerken (UX-review E2).
// Nu staat de logica op één plek (dit bestand); een WordPress-pagina plakt
// alleen nog:
//
//   <script src="https://.../embed.js" data-embed="agenda"
//           data-start-height="600" data-sticky-header="100" async></script>
//
// en krijgt toekomstige fixes vanzelf mee bij de volgende paginalading.
//
// Zoekt zelf naar nog-niet-verwerkte <script data-embed>-tags in de hele
// pagina i.p.v. te vertrouwen op document.currentScript. Veel WordPress-
// sites hebben een optimalisatieplugin (WP Rocket, Autoptimize, Perfmatters,
// "Flying Scripts" e.d.) die scripts samenvoegt/minified/uitstelt — zodra dat
// gebeurt is document.currentScript op het moment dat deze code draait niet
// meer het originele <script>-element (vaak gewoon null), en bleef de iframe
// toen stil (zonder foutmelding) weg. Een losse markering per tag
// (data-voc-embed-done) voorkomt dat dezelfde tag twee keer wordt verwerkt
// als embed.js meerdere keren wordt geladen/uitgevoerd, en laat meerdere
// embeds op één pagina gewoon naast elkaar werken.
(function () {
  var scripts = document.querySelectorAll("script[data-embed]:not([data-voc-embed-done])");

  for (var i = 0; i < scripts.length; i++) {
    initEmbed(scripts[i]);
  }

  function initEmbed(script) {
    script.setAttribute("data-voc-embed-done", "true");

    var embedKind = script.getAttribute("data-embed");
    if (!embedKind) return;

    var origin = script.getAttribute("data-origin");
    if (!origin) {
      try {
        origin = new URL(script.src, window.location.href).origin;
      } catch {
        return;
      }
    }

    var startHeight = parseInt(script.getAttribute("data-start-height"), 10) || 600;
    var stickyHeaderHeight = parseInt(script.getAttribute("data-sticky-header"), 10) || 0;
    var path = "/embed/" + embedKind;

    var iframe = document.createElement("iframe");
    iframe.src = origin + path;
    iframe.width = "100%";
    iframe.height = String(startHeight);
    iframe.style.border = "0";
    iframe.setAttribute("allow", "clipboard-write; web-share");
    iframe.title = "VOC " + embedKind;

    // Agenda-specifiek: een leesbaar #-anker op DEZE (WordPress-)pagina (bv.
    // "#open-borrel", gezet door de "Delen"-knop op de activiteit-
    // detailpagina, zie ShareActivityButton) kan de iframe-inhoud zelf nooit
    // lezen (cross-origin) — dit scriptje wel, en geeft de slug door als
    // ?activiteit=<slug>. /embed/agenda zoekt 'm op en stuurt de iframe door.
    if (embedKind === "agenda") {
      var slug = window.location.hash.replace(/^#/, "");
      if (slug) {
        iframe.src = origin + path + "?activiteit=" + encodeURIComponent(slug);
      }
    }

    script.parentNode.insertBefore(iframe, script);

    window.addEventListener("message", function (event) {
      if (event.source !== iframe.contentWindow || !event.data) return;
      if (event.data.type === "voc-embed-height") {
        iframe.style.height = event.data.height + "px";
      }
      // Geen eigen scrollbalk in de iframe (hoogte volgt de inhoud) —
      // scrollen gebeurt dus altijd op deze pagina. Zonder dit blijft de
      // pagina op dezelfde positie staan zodra je vanuit een lang overzicht
      // doorklikt naar een detailpagina: je ziet dan het midden van die
      // nieuwe pagina i.p.v. de titel/context bovenaan.
      if (event.data.type === "voc-embed-scroll-top") {
        var rect = iframe.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + rect.top - stickyHeaderHeight - 20, behavior: "smooth" });
      }
    });

    // Dit scriptje (of de iframe-inhoud) kan vertraagd laden — vraag daarom
    // zodra de iframe klaar is actief om de huidige hoogte, i.p.v. alleen te
    // wachten op het volgende toevallige berichtje (de iframe-kant herhaalt
    // zijn hoogte toch al de eerste 10s na laden, zie EmbedAutoHeight).
    iframe.addEventListener("load", function () {
      iframe.contentWindow.postMessage({ type: "voc-embed-request-height" }, "*");
    });
  }
})();
