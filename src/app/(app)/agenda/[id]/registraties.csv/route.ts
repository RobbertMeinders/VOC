import { NextResponse } from "next/server";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { activityIdFilter } from "@/lib/agenda/slug";

// UX-review punt 15: CSV-export van aanmeldingen voor bestuur, naar het
// patroon van de .ics-downloadroute hierboven. Alleen de velden die een
// bestuurslid echt nodig heeft om een deelnemerslijst te kunnen gebruiken
// (bv. voor cateringaantallen) — geen interne id's/avatar-paden.
function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireBoard();
  const { id } = await params;

  const supabase = await createClient();
  const { data: activity } = await supabase.from("activities").select("id, title").filter(...activityIdFilter(id)).maybeSingle();

  if (!activity) {
    return NextResponse.json({ error: "Activiteit niet gevonden" }, { status: 404 });
  }

  // get_activity_registration_export (0091) i.p.v. rechtstreeks
  // activity_registrations.select('...profile:profiles(..., email)') —
  // profiles.email is sinds die migratie alleen nog via een RPC leesbaar.
  const [{ data: registrations }, { data: publicRegistrations }] = await Promise.all([
    supabase.rpc("get_activity_registration_export", { p_activity_id: activity.id }),
    supabase
      .from("public_activity_registrations")
      .select("name, email, company_name, created_at")
      .eq("activity_id", activity.id)
      .order("created_at", { ascending: true }),
  ]);

  const rows: string[][] = [["Naam", "E-mailadres", "Bedrijf", "Status", "Lid"]];
  for (const registration of registrations ?? []) {
    rows.push([
      `${registration.first_name} ${registration.last_name}`,
      registration.email,
      "",
      registration.is_waitlisted ? "Wachtlijst" : registration.attended ? "Aangemeld (geweest)" : "Aangemeld",
      "Ja",
    ]);
  }
  for (const registration of publicRegistrations ?? []) {
    rows.push([registration.name, registration.email, registration.company_name ?? "", "Aangemeld", "Nee"]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const fileName = `aanmeldingen-${activity.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
