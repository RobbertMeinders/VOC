import { isEmailConfigured, sendRawHtmlEmail, invitationGreeting } from "@/lib/email/send";
import { renderMessageEmail } from "@/lib/templates/message-render";

// Verplaatst uit beheer/uitnodigingen/actions.ts (Fase 2, personenmodel):
// de automatische uitnodiging-nudge bij een publieke website-aanmelding
// (embed/agenda/actions.ts) heeft dezelfde sjabloon-/verzendlogica nodig als
// het bestuur's eigen "opnieuw versturen"-knop, zonder dat embed/agenda/
// actions.ts (anoniem bereikbaar) het bestuurs-uitnodigingenbestand hoeft te
// importeren.
export type InvitationSource = "nieuw_lid" | "bestaand_lid" | "collega";

export function templateKeyForSource(source: InvitationSource): "uit-nieuw" | "uit-bestaand" | "uit-collega" {
  if (source === "bestaand_lid") return "uit-bestaand";
  if (source === "collega") return "uit-collega";
  return "uit-nieuw";
}

export async function sendInvitationTemplateEmail(
  source: InvitationSource,
  to: string,
  token: string,
  firstName: string | null
): Promise<{ error?: string }> {
  if (!isEmailConfigured()) {
    return { error: "E-mail versturen is niet geconfigureerd." };
  }
  const link = `${process.env.SITE_URL ?? ""}/register/${token}`;
  const rendered = await renderMessageEmail(templateKeyForSource(source), link, { greeting: invitationGreeting(firstName) });
  if (!rendered) {
    return { error: "Sjabloon ontbreekt." };
  }
  return sendRawHtmlEmail(to, rendered.subject, rendered.html, rendered.text);
}
