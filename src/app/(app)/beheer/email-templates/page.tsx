import type { Metadata } from "next";
import Link from "next/link";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/BackLink";
import { EmailTemplateForm } from "@/components/beheer/EmailTemplateForm";
import { PushTemplateForm } from "@/components/beheer/PushTemplateForm";
import type { Database } from "@/lib/types/database";

type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];
type PushTemplate = Database["public"]["Tables"]["push_templates"]["Row"];

export const metadata: Metadata = { title: "E-mailtemplates" };

// "wachtwoord_reset" -> "Wachtwoord reset" — de key zelf blijft de
// identifier (ook zichtbaar in het formulier eronder), dit is puur het
// leesbare tabblad-label.
function formatTabLabel(key: string): string {
  const words = key.split("_");
  return words.map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(" ");
}

function TabRow({
  templates,
  activeKey,
  paramName,
  otherParam,
}: {
  templates: { key: string }[];
  activeKey: string;
  paramName: "emailTab" | "pushTab";
  otherParam: string;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {templates.map((t) => (
        <Link
          key={t.key}
          href={`/beheer/email-templates?${paramName}=${t.key}&${otherParam}`}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
            activeKey === t.key ? "bg-voc-red text-white" : "bg-black/[.06] text-muted dark:bg-white/[.08]"
          }`}
        >
          {formatTabLabel(t.key)}
        </Link>
      ))}
    </div>
  );
}

export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ emailTab?: string; pushTab?: string }>;
}) {
  await requireBoard();
  const supabase = await createClient();
  const { emailTab, pushTab } = await searchParams;

  const [{ data: emailTemplates }, { data: pushTemplates }] = await Promise.all([
    supabase.from("email_templates").select("*").order("key").returns<EmailTemplate[]>(),
    supabase.from("push_templates").select("*").order("key").returns<PushTemplate[]>(),
  ]);

  const emails = emailTemplates ?? [];
  const pushes = pushTemplates ?? [];
  const activeEmailKey = emails.some((t) => t.key === emailTab) ? emailTab! : emails[0]?.key;
  const activePushKey = pushes.some((t) => t.key === pushTab) ? pushTab! : pushes[0]?.key;
  const activeEmailTemplate = emails.find((t) => t.key === activeEmailKey);
  const activePushTemplate = pushes.find((t) => t.key === activePushKey);

  return (
    <div className="flex flex-col gap-4">
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <div>
        <h1 className="text-xl font-semibold text-foreground">E-mailtemplates</h1>
        <p className="text-sm text-muted">
          Inhoud van de mails die de app zelf verstuurt. Gebruik <code>{"{{link}}"}</code> op de plek
          waar de link moet komen.
        </p>
      </div>

      {emails.length > 0 && activeEmailTemplate && (
        <div className="flex flex-col gap-3">
          <TabRow
            templates={emails}
            activeKey={activeEmailKey!}
            paramName="emailTab"
            otherParam={`pushTab=${activePushKey ?? ""}`}
          />
          <EmailTemplateForm key={activeEmailTemplate.key} template={activeEmailTemplate} />
        </div>
      )}

      <div className="mt-2">
        <h2 className="text-lg font-semibold text-foreground">Pushtemplates</h2>
        <p className="text-sm text-muted">Inhoud van de automatische pushmeldingen, per type.</p>
      </div>

      {pushes.length > 0 && activePushTemplate && (
        <div className="flex flex-col gap-3">
          <TabRow
            templates={pushes}
            activeKey={activePushKey!}
            paramName="pushTab"
            otherParam={`emailTab=${activeEmailKey ?? ""}`}
          />
          <PushTemplateForm key={activePushTemplate.key} template={activePushTemplate} />
        </div>
      )}
    </div>
  );
}
