import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Lightbulb, MessageSquareText } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { memberHref } from "@/lib/members/slug";
import { PageHeader } from "@/components/ui/PageHeader";
import { QueryTabs } from "@/components/ui/QueryTabs";
import { TabNavProvider } from "@/lib/ui/TabNavContext";
import { TabContentArea } from "@/components/ui/TabContentArea";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { formatDateTime } from "@/lib/format/date";

export const metadata: Metadata = { title: "Feedback" };

type FeedbackRow = {
  id: string;
  type: "probleem" | "idee";
  message: string;
  page: string | null;
  user_agent: string | null;
  screen_width: number | null;
  screenshot_path: string | null;
  created_at: string;
  profile: { first_name: string; last_name: string; slug: string } | null;
};

// Zeer grove, alleen-voor-weergave inschatting — geen echte device-
// detectie nodig, dit is puur een leesbaar label naast de ruwe user-agent.
function deviceLabel(userAgent: string | null, screenWidth: number | null): string {
  const kind = userAgent && /Mobi|Android|iPhone/i.test(userAgent) ? "Mobiel" : "Desktop";
  return screenWidth ? `${kind} · ${screenWidth}px` : kind;
}

// H (onboarding-opdracht): alleen zichtbaar voor de rol beheerder (niet
// bestuursleden, requireAdmin i.p.v. requireBoard), geen statussen, geen
// reageren, geen notificaties — puur een leesbare inbox.
export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdmin();
  const { type } = await searchParams;
  const activeType = type === "probleem" || type === "idee" ? type : undefined;

  const supabase = await createClient();
  let query = supabase
    .from("testfase_feedback")
    .select("id, type, message, page, user_agent, screen_width, screenshot_path, created_at, profile:profiles(first_name, last_name, slug)")
    .order("created_at", { ascending: false });
  if (activeType) query = query.eq("type", activeType);
  const { data: rows } = await query.returns<FeedbackRow[]>();

  const screenshotUrls = await getSignedStorageUrls(
    supabase,
    "feedback-screenshots",
    (rows ?? []).map((r) => r.screenshot_path)
  );

  return (
    <TabNavProvider>
      <div>
      <PageHeader title="Feedback" description="Wat testleden melden via de testfase-pagina." />

      <div className="mb-4 flex gap-1.5">
        <QueryTabs
          active={activeType ?? "alles"}
          tabs={[
            { key: "alles", href: "/beheer/feedback", label: "Alles" },
            {
              key: "probleem",
              href: "/beheer/feedback?type=probleem",
              label: (
                <>
                  <AlertTriangle size={14} />
                  Problemen
                </>
              ),
            },
            {
              key: "idee",
              href: "/beheer/feedback?type=idee",
              label: (
                <>
                  <Lightbulb size={14} />
                  Ideeën
                </>
              ),
            },
          ]}
        />
      </div>

      <TabContentArea>
      {rows && rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      row.type === "probleem"
                        ? "flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-text"
                        : "flex items-center gap-1 rounded-full bg-petrol-soft px-2 py-0.5 text-xs font-medium text-petrol"
                    }
                  >
                    {row.type === "probleem" ? <AlertTriangle size={11} /> : <Lightbulb size={11} />}
                    {row.type === "probleem" ? "Probleem" : "Idee"}
                  </span>
                  {row.profile ? (
                    <Link href={memberHref(row.profile)} className="text-sm font-medium text-foreground hover:text-petrol">
                      {row.profile.first_name} {row.profile.last_name}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted">Onbekend lid</span>
                  )}
                </div>
                <span className="text-xs text-muted">{formatDateTime(row.created_at)}</span>
              </div>

              <p className="mt-2 text-sm text-foreground">{row.message}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {row.page && <span className="truncate">Pagina: {row.page}</span>}
                <span>{deviceLabel(row.user_agent, row.screen_width)}</span>
                {row.screenshot_path && screenshotUrls.get(row.screenshot_path) && (
                  <a
                    href={screenshotUrls.get(row.screenshot_path) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-petrol hover:underline"
                  >
                    Schermafbeelding bekijken
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ComingSoon
          icon={MessageSquareText}
          title="Nog geen feedback"
          description="Meldingen van testleden via /testfase verschijnen hier."
        />
      )}
      </TabContentArea>
      </div>
    </TabNavProvider>
  );
}
