import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { contentDisposition } from "@/lib/http/content-disposition";

// Een PDF-voorbeeld in een <iframe> laadde de signed Storage-URL rechtstreeks
// (ander domein dan het portaal) en liep daar vast op "Deze content is
// geblokkeerd" — Supabase Storage's eigen respons staat framing vanaf een
// ander origin niet toe. Deze route haalt het bestand in plaats daarvan
// server-side op (documents_members_select regelt de toegang, net als
// elders) en geeft het same-origin terug, zodat het portaal zelf hem wél mag
// framen — zie de uitzondering voor dit pad in next.config.ts.
//
// Alleen bestuur kan een document uploaden (documents_board_insert), maar
// het opgeslagen mime_type/file_name zijn wat de uploader toen opgaf, niet
// gevalideerd tegen de echte bestandsinhoud. Een niet-toegestaan type (bv.
// text/html, image/svg+xml) gaat daarom altijd als attachment i.p.v. inline
// — een <iframe> rendert zo'n bestand nooit uit, een download wel. Zelfs
// voor een toegestaan type: X-Content-Type-Options: nosniff voorkomt dat de
// browser het gedeclareerde type zelf nog probeert te "raden" (content
// sniffing) als het toch niet overeenkomt met de echte inhoud.
const INLINE_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document } = await supabase
    .from("documents")
    .select("storage_path, mime_type, file_name")
    .eq("id", id)
    .maybeSingle();

  if (!document) {
    return new NextResponse(null, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("documents").download(document.storage_path);
  if (error || !data) {
    return new NextResponse(null, { status: 404 });
  }

  const mimeType = document.mime_type || data.type || "application/octet-stream";
  const disposition = INLINE_MIME_TYPES.has(mimeType) ? "inline" : "attachment";

  return new NextResponse(data, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": contentDisposition(disposition, document.file_name),
      "X-Frame-Options": "SAMEORIGIN",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
