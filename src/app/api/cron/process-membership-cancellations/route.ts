import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Eén keer per dag (vercel.json): rondt bedrijven af waarvan de gekozen
// opzeg-einddatum (companies.membership_end_date) is bereikt — zet de
// status op 'oud-lid' en trekt elk gekoppeld account in. Zie
// process_company_membership_cancellations() (0177) voor de details; die
// hergebruikt anonymize_profile_now(), dus de bestaande anonymize-members-
// cron pikt de auth.users-opruiming van diezelfde profielen de volgende
// keer automatisch mee op.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_company_membership_cancellations");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ companiesProcessed: data?.length ?? 0, details: data ?? [] });
}
