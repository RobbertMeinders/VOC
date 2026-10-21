import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// UX-review E6: de bedrijvengids-embed gaf elk logo mee als signed URL — een
// nieuwe, unieke token per aanvraag, dus noch de browser noch Next.js'
// image-optimizer kon 'm ooit cachen (elke paginaweergave, voor elke
// bezoeker, opnieuw gedownload). Een logo-upload krijgt altijd een vers,
// willekeurig bestandspad (zie uploadImage/randomFileName) i.p.v. een vast
// pad te overschrijven, dus dit pad is zelf al "content-addressed" — een
// lange, immutable cache hierop is veilig: wijzigt het logo, dan wijzigt
// ook het pad, en is dit precies dezelfde garantie als bij een gehashte
// bundlenaam.
//
// is_public_company() (0056_public_storage_rls_fix_and_avatars.sql) is ook
// al de voorwaarde van de company_logos_public_select-storage-policy — deze
// losse check is alleen voor een nette 404 i.p.v. op de storage-fout te
// moeten vertrouwen.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ companyId: string; fileName: string }> }
) {
  const { companyId, fileName } = await params;
  const supabase = await createClient();

  const { data: isPublic } = await supabase.rpc("is_public_company", { p_company_id: companyId });
  if (!isPublic) {
    return new NextResponse(null, { status: 404 });
  }

  const { data, error } = await supabase.storage.from("company-logos").download(`${companyId}/${fileName}`);
  if (error || !data) {
    return new NextResponse(null, { status: 404 });
  }

  // M5: nieuwe uploads kunnen hier geen SVG meer zijn (0148, bucket- en
  // app-niveau), maar een bestaand, al vóór die migratie geüpload logo kan
  // dat nog zijn. Content-Disposition: attachment en een sandboxing CSP
  // voorkomen dat zo'n bestand ooit als HTML/script in deze origin wordt
  // uitgevoerd als iemand de URL rechtstreeks opent — alleen voor dat ene
  // geval, want diezelfde headers zouden een gewone PNG/JPEG/WebP juist
  // laten downloaden i.p.v. inline tonen als <img> op de embed-pagina.
  const isSvg = data.type === "image/svg+xml";

  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ...(isSvg ? { "Content-Disposition": "attachment", "Content-Security-Policy": "sandbox" } : {}),
    },
  });
}
