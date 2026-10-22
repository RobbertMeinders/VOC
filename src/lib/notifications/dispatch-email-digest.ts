import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendRawHtmlEmail, escapeHtml } from "@/lib/email/send";
import { NOTIFICATION_TYPE_LABELS, type ConfigurableNotificationType } from "@/lib/notifications/type-labels";
import { buildPreferencesUrl } from "@/lib/newsletter/unsubscribe";

type DigestRow = {
  notification_id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  email: string;
  created_at: string;
};

// Meldingensysteem-overhaul Fase 2: dagelijkse verzamel-mail voor leden die
// voor "dagelijkse samenvatting" kozen i.p.v. losse mails (new_activity/
// feed_comment/feed_mention, zie 0173). get_pending_email_digest_
// notifications claimt (dezelfde 10-minuten-lease als het directe pad,
// 0134) en levert de ruwe rijen; groeperen per lid + de mail zelf bouwen
// gebeurt hier. Mirror van dispatch-email.ts qua verstuur-/boekingsgedrag
// (A4): pas als emailed boeken na een geslaagde verzending — bij een fout
// blijft de rij onverstuurd staan en loopt de lease vanzelf af voor een
// volgende poging (de cron draait 1x/dag, zie vercel.json).
export async function dispatchDailyEmailDigest(limit = 500): Promise<{ sent: number }> {
  const supabase = createAdminClient();
  const { data: pending, error } = await supabase.rpc("get_pending_email_digest_notifications", { p_limit: limit });
  if (error || !pending || pending.length === 0) {
    return { sent: 0 };
  }

  const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");

  const byProfile = new Map<string, { email: string; items: DigestRow[] }>();
  for (const item of pending as DigestRow[]) {
    const existing = byProfile.get(item.profile_id);
    if (existing) {
      existing.items.push(item);
    } else {
      byProfile.set(item.profile_id, { email: item.email, items: [item] });
    }
  }

  const emailedIds: string[] = [];
  for (const [profileId, { email, items }] of byProfile) {
    const byType = new Map<string, DigestRow[]>();
    for (const item of items) {
      const group = byType.get(item.type);
      if (group) group.push(item);
      else byType.set(item.type, [item]);
    }

    const sections = [...byType.entries()]
      .map(([type, typeItems]) => {
        const label = NOTIFICATION_TYPE_LABELS[type as ConfigurableNotificationType]?.label ?? type;
        const rows = typeItems
          .map((item) => {
            const title = escapeHtml(item.title);
            const linkUrl = item.link ? `${siteUrl}${item.link}` : "";
            return linkUrl ? `<li><a href="${escapeHtml(linkUrl)}">${title}</a></li>` : `<li>${title}</li>`;
          })
          .join("");
        return `<h3 style="margin:16px 0 4px;font-size:15px;">${escapeHtml(label)}</h3><ul style="margin:0;padding-left:20px;">${rows}</ul>`;
      })
      .join("");

    const preferencesUrl = buildPreferencesUrl(siteUrl, "profile", profileId);
    const html = `<p>Je dagelijkse samenvatting:</p>${sections}<p style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e5ea;font-size:12px;color:#6b6b72;">Je ontvangt dit als lid van de Veendammer Ondernemers Compagnie. <a href="${escapeHtml(preferencesUrl)}" style="color:#6b6b72;">Voorkeuren aanpassen</a></p>`;

    const result = await sendRawHtmlEmail(email, "Je dagelijkse samenvatting", html);
    if (!result.error || result.skipped) {
      emailedIds.push(...items.map((item) => item.notification_id));
    } else {
      console.error(`[dispatch-email-digest] versturen mislukt voor ${email}:`, result.error);
    }
  }

  if (emailedIds.length > 0) {
    await supabase.rpc("mark_notifications_emailed", { p_ids: emailedIds });
  }

  return { sent: emailedIds.length };
}
