import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditAction } from "@/lib/audit/log";
import { buildMembersXlsx } from "@/lib/export/members";

// Lidmaatschap-traject Deel 2: alleen beheerders (requireAdmin, niet elk
// bestuurslid) kunnen de ledenlijst exporteren. get_members_export (0179)
// doet zijn eigen is_admin()-check — requireAdmin() hier is de eerste,
// zichtbare grens (redirect i.p.v. een kale 403), de RPC is de echte.
export async function GET() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_members_export");
  if (error) {
    return NextResponse.json({ error: "Export mislukt" }, { status: 500 });
  }

  await logAuditAction("members_export_xlsx", "export", undefined, { rowCount: data?.length ?? 0 });

  const buffer = await buildMembersXlsx(data ?? []);
  const fileName = `leden-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
