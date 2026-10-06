"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddressWithReason } from "@/lib/geo/geocode";
import { invalidateQuery } from "@/lib/cache/queryCache";

export type RegeocodeState = { error?: string; total?: number; fixed?: number; sampleFailure?: string };

// Vangt twee historische gaten: bedrijven die vóór de geocode-stap in
// bulkImportMembersAction bestonden (CSV-import deed nog geen geocodering)
// en bedrijven waarbij een eerdere poging mislukte (Nominatim tijdelijk
// onbereikbaar) voordat updateCompanyAction's "niet clobberen bij mislukking"
// -fix er was. Sequentieel met ~1,1s pauze, zelfde reden als elders
// (Nominatims gebruiksvoorwaarden: max. 1 aanroep per seconde).
export async function regeocodeMissingCompaniesAction(): Promise<RegeocodeState> {
  await requireBoard();
  const supabase = await createClient();

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, address, postal_code, city")
    .or("latitude.is.null,longitude.is.null")
    .or("address.not.is.null,city.not.is.null");

  if (error) {
    return { error: "Ophalen van bedrijven is niet gelukt." };
  }
  if (!companies || companies.length === 0) {
    return { total: 0, fixed: 0 };
  }

  let fixed = 0;
  let sampleFailure: string | undefined;
  for (const [index, company] of companies.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const { coordinates, reason } = await geocodeAddressWithReason({
      address: company.address,
      postalCode: company.postal_code,
      city: company.city,
    });
    if (!coordinates) {
      if (reason && !sampleFailure) sampleFailure = reason;
      continue;
    }

    const { error: updateError } = await supabase
      .from("companies")
      .update({ latitude: coordinates.latitude, longitude: coordinates.longitude })
      .eq("id", company.id);
    if (!updateError) fixed += 1;
  }

  invalidateQuery("bedrijven-page-data");
  invalidateQuery("beheer-bedrijven-page-data");
  revalidatePath("/bedrijven");
  revalidatePath("/beheer/bedrijven");

  return { total: companies.length, fixed, sampleFailure: fixed === companies.length ? undefined : sampleFailure };
}
