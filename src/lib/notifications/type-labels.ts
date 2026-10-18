// Statische, Nederlandse omschrijving per configureerbaar notificatietype,
// gebruikt door de Notificatieregels-tab (Beheer → Communicatie). Puur
// weergave — geen databasekolom, om de instellingentabel niet nodeloos uit
// te breiden met tekst die hier net zo goed als code kan staan.
//
// newsletter en manual_broadcast staan hier bewust niet in: die hebben hun
// eigen beheerscherm (doelgroepen resp. Handmatig pushbericht) en worden
// niet via notification_type_settings geregeld.
export const CONFIGURABLE_NOTIFICATION_TYPES = [
  "new_member",
  "activity_submission",
  "company_membership_request",
  "feed_post_report",
  "access_request",
  "activity_decision",
  "company_membership_decision",
  "feed_comment",
  "feed_mention",
  "waitlist_promoted",
  "activity_reminder",
  "new_activity",
  "activity_changed",
  "activity_cancelled",
  "report_resolved",
] as const;

export type ConfigurableNotificationType = (typeof CONFIGURABLE_NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<ConfigurableNotificationType, { label: string; recipients: string }> = {
  new_member: { label: "Nieuw lid geregistreerd", recipients: "Rollen" },
  activity_submission: { label: "Lid dient activiteit in", recipients: "Rollen" },
  company_membership_request: { label: "Bedrijfskoppeling aangevraagd", recipients: "Collega's bij dat bedrijf + rollen" },
  feed_post_report: { label: "Bericht in de feed gerapporteerd", recipients: "Rollen" },
  access_request: { label: "Toegang tot ledenportaal aangevraagd", recipients: "Rollen" },
  activity_decision: { label: "Ingediende activiteit beoordeeld", recipients: "Indiener van de activiteit" },
  company_membership_decision: { label: "Bedrijfskoppeling beoordeeld", recipients: "Aanvrager" },
  feed_comment: { label: "Reactie op je bericht", recipients: "Auteur van het bericht" },
  feed_mention: { label: "Genoemd (@) in de feed", recipients: "Genoemde leden/bedrijfscollega's" },
  waitlist_promoted: { label: "Van de wachtlijst gehaald", recipients: "Betrokken lid" },
  activity_reminder: { label: "Herinnering (2 dagen vooraf)", recipients: "Aangemelde leden" },
  new_activity: { label: "Nieuwe activiteit gepubliceerd", recipients: "Alle actieve leden" },
  activity_changed: { label: "Activiteit gewijzigd", recipients: "Aangemelde leden" },
  activity_cancelled: { label: "Activiteit afgelast", recipients: "Aangemelde leden" },
  report_resolved: { label: "Rapportage afgehandeld", recipients: "Melder" },
};

// Alleen deze types hebben een bewerkbare rollenlijst — de overige richten
// zich op een vast individu/vaste relatie (indiener, melder, collega's...)
// en hebben geen "rol"-begrip.
export const ROLE_BASED_NOTIFICATION_TYPES: ConfigurableNotificationType[] = [
  "new_member",
  "activity_submission",
  "company_membership_request",
  "feed_post_report",
  "access_request",
];

export const ASSIGNABLE_ROLES = ["bestuurslid", "beheerder"] as const;
