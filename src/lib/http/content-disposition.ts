// Bouwt een veilige Content-Disposition-headerwaarde op voor een
// gebruikers-/clientgestuurde bestandsnaam (bv. document.file_name,
// door bestuur bij upload opgegeven) -- rechtstreeks interpoleren in
// `filename="${naam}"` laat een " in de naam de aanhalingstekens
// doorbreken (header-parameterinjectie). Het ASCII-only filename= blijft
// als terugval voor oudere clients, filename*=UTF-8''... (RFC 5987) geeft
// de volledige, correct gecodeerde naam (ook niet-ASCII-tekens) voor
// moderne browsers.
export function contentDisposition(type: "inline" | "attachment", filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(filename);
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
