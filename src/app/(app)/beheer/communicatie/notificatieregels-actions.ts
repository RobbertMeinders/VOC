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

// Hoofdschakelaar boven de tabel (NotificatieregelsTab): zet push en
// e-mail voor élke regel in één keer aan/uit, zonder de aparte "aan/uit"-
// schakelaar per regel, de rollen of in-app aan te raken — alleen de twee
// kolommen die ook echt uitgaand verkeer bepalen. Bewust geen "vorige
// stand onthouden": weer aanzetten zet gewoon alles weer aan, net als een
// enkele regel die je terugzet.
export async function updateAllNotificationChannelsAction(enabled: boolean): Promise<UpdateAllNotificationChannelsState> {
  const profile = await requireBoard();

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_type_settings")
    .update({ channel_push: enabled, channel_email: enabled, updated_by: profile.id });

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  revalidatePath("/beheer/communicatie");
  return {};
}
