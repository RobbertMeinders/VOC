import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type AnonymizeProfileResult = { success: boolean; error?: string };

// Gedeelde "verwijder dit lid volledig"-stappen: database-anonimisering via
// anonymize_profile_now (0078, service_role-only), auth.users scrubben +
// blokkeren, actieve sessie opruimen, en de oude avatar uit storage
// verwijderen. Oorspronkelijk alleen in deleteMemberAction (leden/[id]/
// actions.ts); hierheen verplaatst zodat deleteCompanyWithPeopleAction
// (bedrijven/[id]/actions.ts) dezelfde stappen per gekoppeld lid kan
// hergebruiken i.p.v. dit AVG-kritieke blok te dupliceren.
export async function anonymizeProfileFully(profileId: string): Promise<AnonymizeProfileResult> {
  const admin = createAdminClient();
  const { data: anonymized, error } = await admin.rpc("anonymize_profile_now", { p_id: profileId });

  if (error || !anonymized || anonymized.length === 0) {
    return { success: false, error: "Verwijderen is niet gelukt. Probeer het opnieuw." };
  }

  // AVG-fix (portaal-gezondheidsonderzoek A6, migratie 0136): deze aanroepen
  // lopen buiten de database-transactie van anonymize_profile_now() om.
  // Mislukken ze (netwerkhik, tijdelijke storing), dan pakt de dagelijkse
  // anonymize-members-cron deze rij alsnog op (anonymized_at staat al,
  // auth_scrubbed_at/pending_avatar_cleanup pas na succes hier) — i.p.v.
  // dat het echte e-mailadres voorgoed in auth.users blijft staan.
  const [{ old_avatar_url }] = anonymized;
  // ban_duration blokkeert het account zelf (een bestaand wachtwoord werkt
  // niet meer, net als elke nieuwe inlogpoging); force_logout_member ruimt
  // daarnaast de al actieve sessie/refresh-tokens op (0111).
  const { error: authError } = await admin.auth.admin.updateUserById(profileId, {
    email: `verwijderd-${profileId}@voc-ledenportaal.invalid`,
    ban_duration: "876000h",
  });
  if (!authError) {
    await admin.rpc("mark_profiles_auth_scrubbed", { p_ids: [profileId] });
  } else {
    console.error(`[members] anonymizeProfileFully: auth.users-update mislukt voor ${profileId}:`, authError);
  }
  await admin.rpc("force_logout_member", { p_id: profileId });
  if (old_avatar_url) {
    const { error: storageError } = await admin.storage.from("avatars").remove([old_avatar_url]);
    if (!storageError) {
      await admin.rpc("mark_profiles_avatar_cleaned", { p_ids: [profileId] });
    }
  }

  return { success: true };
}
