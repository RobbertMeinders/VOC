import type { Metadata } from "next";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { ComingSoon } from "@/components/ui/ComingSoon";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Nieuws" };

type NewsItem = Database["public"]["Tables"]["news_items"]["Row"];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export default async function NieuwsPage() {
  await requireProfile();
  const supabase = await createClient();

  // Zichtbaarheid is voor elk actief lid identiek (news_items_members_select
  // kent geen per-gebruiker variatie), dus dit resultaat delen is veilig —
  // zelfde patroon als documenten-page-data.
  const { data: newsItems } = await cachedQuery("nieuws-page-data", 60_000, () =>
    supabase.from("news_items").select("*").order("created_at", { ascending: false }).returns<NewsItem[]>()
  );

  const urls = await getSignedStorageUrls(
    supabase,
    "news-images",
    (newsItems ?? []).flatMap((n) => (n.image_url ? [n.image_url] : []))
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Nieuws</h1>
      <p className="mb-6 text-sm text-muted">Mededelingen en updates vanuit het bestuur.</p>

      {newsItems && newsItems.length > 0 ? (
        <div className="flex flex-col gap-4">
          {newsItems.map((item) => {
            const imageUrl = item.image_url ? (urls.get(item.image_url) ?? null) : null;
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                {imageUrl && (
                  <Image
                    src={imageUrl}
                    alt=""
                    width={640}
                    height={320}
                    className="h-56 w-full object-cover sm:h-72"
                  />
                )}
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-muted">{formatDate(item.created_at)}</p>
                  <h2 className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">{item.title}</h2>
                  {item.subtitle && <p className="mt-0.5 text-sm font-medium text-muted">{item.subtitle}</p>}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <ComingSoon
          icon={Newspaper}
          title="Nog geen nieuwsberichten"
          description="Zodra het bestuur iets deelt, verschijnt het hier."
        />
      )}
    </div>
  );
}
