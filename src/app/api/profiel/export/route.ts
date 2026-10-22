import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { getOwnDataExport } from "@/lib/profile/export-data";

// Self-service "download mijn gegevens" — geen beheerderstussenkomst nodig.
// Dit is de technische (JSON) variant; /profiel/export geeft dezelfde data
// als leesbaar overzicht.
export async function GET() {
  const profile = await requireProfile();
  const data = await getOwnDataExport(profile);

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mijn-gegevens-${profile.id}.json"`,
    },
  });
}
