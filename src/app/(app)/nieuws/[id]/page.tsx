import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { BackLink } from "@/components/ui/BackLink";
import { newsItemHref, newsItemIdFilter } from "@/lib/news/slug";
import { formatDateLong as formatDate } from "@/lib/format/date";
import type { Database } from "@/lib/types/database";

type NewsItem = Database["public"]["Tables"]["news_items"]["Row"];

async function getNewsItem(param: string): Promise<NewsItem | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_items")
    .select("*")
    .filter(...newsItemIdFilter(param))
    .maybeSingle<NewsItem>();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getNewsItem(id);
  return { title: item ? item.title : "Nieuws" };
}

export default async function NieuwsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id: routeParam } = await params;
  const item = await getNewsItem(routeParam);
  if (!item) notFound();
  // URL-ronde #101: een kaal UUID (oude, rechtstreeks verstuurde link)
  // blijft werken, maar stuurt door naar de canonieke slug-URL — zelfde
  // patroon als bedrijven/activiteiten. Geen alias-tabel nodig: deze slug
  // is, net als leden/bedrijven, bewust voor altijd stabiel.
  if (routeParam !== item.slug) {
    permanentRedirect(newsItemHref(item));
  }

  const supabase = await createClient();
  const imageUrl = item.image_url ? (await getSignedStorageUrls(supabase, "news-images", [item.image_url])).get(item.image_url) ?? null : null;

  return (
    <div>
      <BackLink href="/nieuws" label="Terug naar Nieuws" />

      <article className="overflow-hidden rounded-2xl bg-surface shadow-sm">
        {imageUrl && (
          <Image src={imageUrl} alt="" width={720} height={400} className="h-56 w-full object-cover sm:h-80" />
        )}
        <div className="p-5 sm:p-8">
          <p className="text-xs text-muted">{formatDate(item.created_at)}</p>
          <h1 className="font-display mt-1 text-[1.5rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[1.75rem]">
            {item.title}
          </h1>
          {item.subtitle && <p className="mt-1 text-sm font-medium text-muted">{item.subtitle}</p>}
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{item.body}</p>
        </div>
      </article>
    </div>
  );
}
