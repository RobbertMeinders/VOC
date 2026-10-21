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
// en hebben geen "rol"-begrip. new_activity ging oorspronkelijk altijd naar
// "alle actieve leden" (hardcoded in notify_activity_published) — nu ook
// rolconfigureerbaar, met diezelfde combinatie als standaardwaarde zodra er
// nog geen expliciete keuze is gemaakt (zie notification_dispatch_config).
export const ROLE_BASED_NOTIFICATION_TYPES: ConfigurableNotificationType[] = [
  "new_member",
  "activity_submission",
  "company_membership_request",
  "feed_post_report",
  "access_request",
  "new_activity",
];

// Notificatieregels-scherm: twee groepen, in deze volgorde. Alles wat niet in
// MEMBER_FACING_NOTIFICATION_TYPES staat, valt in de bestuur/beheer-groep.
export const MEMBER_FACING_NOTIFICATION_TYPES: ConfigurableNotificationType[] = [
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
];

// Meldingensysteem-overhaul Fase 2: de enige drie types met een e-mail-
// digest-optie (dagelijkse samenvatting i.p.v. losse mail) — zie
// email_digest_new_activity/_feed_comment/_feed_mention op profiles
// (0173). Alleen deze drie hebben de volumepieken die een samenvatting
// de moeite waard maken; de overige types blijven altijd direct.
export const DIGEST_ELIGIBLE_TYPES: ConfigurableNotificationType[] = ["new_activity", "feed_comment", "feed_mention"];

// "lid" toegevoegd zodat een rolgebaseerd type (met name new_activity) ook
// specifiek naar gewone leden gericht kan worden i.p.v. alleen bestuur/
// beheer — de overige vier rolgebaseerde types blijven in de praktijk
// bestuur/beheer-only (een lid heeft geen reden om bijvoorbeeld een nieuwe-
// lid-melding te krijgen), maar de rol zelf is nu overal kiesbaar.
export const ASSIGNABLE_ROLES = ["lid", "bestuurslid", "beheerder"] as const;
