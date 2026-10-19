"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";
import { ASSIGNABLE_ROLES, type ConfigurableNotificationType } from "@/lib/notifications/type-labels";

export type NotificationRuleUpdateState = { error?: string };

// Eén generieke actie voor elk veld van een regel (status, kanalen, rollen)
// i.p.v. losse acties per schakelaar — elke rij in de tabel roept 'm aan met
// alleen het veld dat is gewijzigd, de rest laat de DB-rij ongewijzigd.
export async function updateNotificationRuleAction(
  type: ConfigurableNotificationType,
  patch: {
    enabled?: boolean;
    channel_inapp?: boolean;
    channel_push?: boolean;
    channel_email?: boolean;
    roles?: UserRole[];
  }
): Promise<NotificationRuleUpdateState> {
  const profile = await requireBoard();

  if (patch.roles) {
    if (patch.roles.length === 0) {
      return { error: "Kies minstens één rol." };
    }
    if (patch.roles.some((role) => !(ASSIGNABLE_ROLES as readonly string[]).includes(role))) {
      return { error: "Ongeldige rol." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_type_settings")
    .update({ ...patch, updated_by: profile.id })
    .eq("type", type);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/communicatie");
  return {};
}

export type UpdateAllNotificationChannelsState = { error?: string };

// Hoofdschakelaar boven de tabel (NotificatieregelsTab): zet de "status"
// (enabled) van élke regel in één keer aan/uit — dezelfde kolom als de
// losse schakelaar in de Status-kolom per regel. Bewust NIET channel_push/
// channel_email: die zet je per regel individueel in, en als de
// hoofdschakelaar die zou overschrijven dan ben je na uit-en-weer-aanzetten
// je eigen kanaalkeuze per regel kwijt. Via enabled blijft channel_push/
// channel_email/roles per regel altijd intact — enabled=false stopt
// (via notification_dispatch_config) toch alle verzending voor die regel.
export async function updateAllNotificationChannelsAction(enabled: boolean): Promise<UpdateAllNotificationChannelsState> {
  const profile = await requireBoard();

  const supabase = await createClient();
  // Expliciet gefilterd (type is de not-null primary key, dus dit raakt
  // altijd elke rij) i.p.v. een update zonder enig filter — dat laatste
  // bleek in de praktijk te mislukken.
  const { error } = await supabase
    .from("notification_type_settings")
    .update({ enabled, updated_by: profile.id })
    .not("type", "is", null);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/communicatie");
  return {};
}
