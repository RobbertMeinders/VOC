import type { Metadata } from "next";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/ui/BackLink";
import { EmailTemplateForm } from "@/components/beheer/EmailTemplateForm";
import { PushTemplateForm } from "@/components/beheer/PushTemplateForm";
import type { Database } from "@/lib/types/database";

type EmailTemplate = Database["public"]["Tables"]["email_templates"]["Row"];
type PushTemplate = Database["public"]["Tables"]["push_templates"]["Row"];

export const metadata: Metadata = { title: "E-mailtemplates" };

export default async function EmailTemplatesPage() {
  await requireBoard();
  const supabase = await createClient();

  const [{ data: emailTemplates }, { data: pushTemplates }] = await Promise.all([
    supabase.from("email_templates").select("*").order("key").returns<EmailTemplate[]>(),
    supabase.from("push_templates").select("*").order("key").returns<PushTemplate[]>(),
  ]);

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

      {(emailTemplates ?? []).map((template) => (
        <EmailTemplateForm key={template.key} template={template} />
      ))}

      <div className="mt-2">
        <h2 className="text-lg font-semibold text-foreground">Pushtemplates</h2>
        <p className="text-sm text-muted">Inhoud van de automatische pushmeldingen, per type.</p>
      </div>

      {(pushTemplates ?? []).map((template) => (
        <PushTemplateForm key={template.key} template={template} />
      ))}
    </div>
  );
}
