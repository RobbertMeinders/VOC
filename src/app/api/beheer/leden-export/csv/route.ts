import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { logAuditAction } from "@/lib/audit/log";
import { buildMembersCsv } from "@/lib/export/members";

// Volledige-backupvariant van de .xlsx-export (zie die route hiernaast):
// één rij per contactpersoon i.p.v. per bedrijf, met alle ruwe velden.
export async function GET() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_members_export");
  if (error) {
    return NextResponse.json({ error: "Export mislukt" }, { status: 500 });
  }

  await logAuditAction("members_export_csv", "export", undefined, { rowCount: data?.length ?? 0 });

  const csv = buildMembersCsv(data ?? []);
  const fileName = `leden-export-backup-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
