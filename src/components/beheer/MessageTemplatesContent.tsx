import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings/app-settings";
import { MessageTemplatesClient } from "@/components/beheer/MessageTemplatesClient";
import type { MessageTemplate } from "@/components/beheer/MessageTemplateEditor";

export async function MessageTemplatesContent() {
  const supabase = await createClient();
  const [{ data: templates }, settings] = await Promise.all([
    supabase.from("message_templates").select("*").order("sort_order").returns<MessageTemplate[]>(),
    getAppSettings(),
  ]);

  return <MessageTemplatesClient templates={templates ?? []} settings={settings} />;
}
