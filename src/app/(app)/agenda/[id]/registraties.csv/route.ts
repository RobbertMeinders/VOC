import { NextResponse } from "next/server";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

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
  const [{ data: activity }, { data: registrations }, { data: publicRegistrations }] = await Promise.all([
    supabase.from("activities").select("title").eq("id", id).maybeSingle(),
    supabase
      .from("activity_registrations")
      .select("is_waitlisted, attended, profile:profiles(first_name, last_name, email)")
      .eq("activity_id", id)
      .order("created_at", { ascending: true })
      .returns<{ is_waitlisted: boolean; attended: boolean; profile: { first_name: string; last_name: string; email: string } | null }[]>(),
    supabase
      .from("public_activity_registrations")
      .select("name, email, company_name, created_at")
      .eq("activity_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!activity) {
    return NextResponse.json({ error: "Activiteit niet gevonden" }, { status: 404 });
  }

  const rows: string[][] = [["Naam", "E-mailadres", "Bedrijf", "Status", "Lid"]];
  for (const registration of registrations ?? []) {
    if (!registration.profile) continue;
    rows.push([
      `${registration.profile.first_name} ${registration.profile.last_name}`,
      registration.profile.email,
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
