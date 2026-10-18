import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export type SetBoardPositionResult = { error?: string };

// Eén gedeelde helper voor "wijzig de huidige bestuursfunctie van dit lid" —
// gebruikt door zowel het snel-bewerken-paneel in Beheer -> Leden als het
// Bestuur-tabblad in Beheer -> Vereniging, zodat beide plekken precies
// hetzelfde gedrag hebben: geschiedenis via ended_at (nooit een update van
// de titel zelf), nooit twee actieve rijen tegelijk, en geen onnodige
// beëindigen+opnieuw-aanmaken-cyclus als de titel niet wijzigt. Elke stap
// geeft een duidelijke fout terug i.p.v. die te negeren — een stil
// mislukte opslag liet eerder een bestuurder onzichtbaar op de
// Bestuur-pagina staan zonder enige foutmelding.
export async function setBoardPosition(
  supabase: SupabaseClient<Database>,
  profileId: string,
  title: string,
  createdBy: string
): Promise<SetBoardPositionResult> {
  const trimmed = title.trim();

  const { data: activePosition, error: selectError } = await supabase
    .from("board_positions")
    .select("id, title")
    .eq("profile_id", profileId)
    .is("ended_at", null)
    .maybeSingle();
  if (selectError) {
    return { error: "Opslaan van de bestuursfunctie is niet gelukt. Probeer het opnieuw." };
  }

  if (trimmed === (activePosition?.title ?? "")) {
    return {};
  }

  if (activePosition) {
    const { error } = await supabase
      .from("board_positions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", activePosition.id);
    if (error) {
      return { error: "Opslaan van de bestuursfunctie is niet gelukt. Probeer het opnieuw." };
    }
  }

  if (trimmed) {
    const { error } = await supabase
      .from("board_positions")
      .insert({ profile_id: profileId, title: trimmed, created_by: createdBy });
    if (error) {
      return { error: "Opslaan van de bestuursfunctie is niet gelukt. Probeer het opnieuw." };
    }
  }

  return {};
}
