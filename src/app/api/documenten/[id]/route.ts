import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Een PDF-voorbeeld in een <iframe> laadde de signed Storage-URL rechtstreeks
// (ander domein dan het portaal) en liep daar vast op "Deze content is
// geblokkeerd" — Supabase Storage's eigen respons staat framing vanaf een
// ander origin niet toe. Deze route haalt het bestand in plaats daarvan
// server-side op (documents_members_select regelt de toegang, net als
// elders) en geeft het same-origin terug, zodat het portaal zelf hem wél mag
// framen — zie de uitzondering voor dit pad in next.config.ts.
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

  return new NextResponse(data, {
    headers: {
      "Content-Type": document.mime_type || data.type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${document.file_name}"`,
      "X-Frame-Options": "SAMEORIGIN",
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
