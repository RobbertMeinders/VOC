import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { cachedQuery } from "@/lib/cache/queryCache";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { newsItemHref } from "@/lib/news/slug";
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
    supabase.from("news_items").select("*").order("position", { ascending: true }).returns<NewsItem[]>()
  );

  const urls = await getSignedStorageUrls(
    supabase,
    "news-images",
    (newsItems ?? []).flatMap((n) => (n.image_url ? [n.image_url] : []))
  );

  return (
    <div>
      <h1 className="mb-6 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Nieuws</h1>

      {newsItems && newsItems.length > 0 ? (
        // Afwerkronde blok 4: overzicht met foto, titel, datum en twee
        // regels tekst i.p.v. het hele bericht — klikken opent het volle
        // bericht op /nieuws/[id] (anders werd dit overzicht al snel erg
        // lang: elk bericht stond hier in zijn geheel).
        <div className="flex flex-col gap-4">
          {newsItems.map((item) => {
            const imageUrl = item.image_url ? (urls.get(item.image_url) ?? null) : null;
            return (
              <Link
                key={item.id}
                href={newsItemHref(item)}
                className="flex gap-3 overflow-hidden rounded-2xl bg-surface p-3 shadow-sm transition-all duration-150 hover:border-muted hover:shadow-md sm:gap-4 sm:p-4"
              >
                {imageUrl && (
                  <Image
                    src={imageUrl}
                    alt=""
                    width={112}
                    height={112}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted">{formatDate(item.created_at)}</p>
                  <h2 className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">{item.title}</h2>
                  {item.subtitle && <p className="mt-0.5 truncate text-sm font-medium text-muted">{item.subtitle}</p>}
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-foreground">{item.body}</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <ComingSoon
          icon={Newspaper}
          title="Er zijn momenteel geen nieuwsberichten."
        />
      )}
    </div>
  );
}
