import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCronSecret } from "@/lib/auth/cron-secret";

// Eén keer per dag (vercel.json): rondt bedrijven af waarvan de gekozen
// opzeg-einddatum (companies.membership_end_date) is bereikt — zet de
// status op 'oud-lid' en trekt elk gekoppeld account in. Zie
// process_company_membership_cancellations() (0177) voor de details; die
// hergebruikt anonymize_profile_now(), dus de bestaande anonymize-members-
// cron pikt de auth.users-opruiming van diezelfde profielen de volgende
// keer automatisch mee op.
export async function GET(request: Request) {
  if (!isValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_company_membership_cancellations");
  if (error) {
    console.error("[cron/process-membership-cancellations] mislukt:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ companiesProcessed: data?.length ?? 0, details: data ?? [] });
}
