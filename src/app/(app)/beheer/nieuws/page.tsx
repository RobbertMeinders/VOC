import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { NewsItemForm } from "@/components/beheer/NewsItemForm";
import { NewsItemRow } from "@/components/beheer/NewsItemRow";
import type { Database } from "@/lib/types/database";

export const metadata: Metadata = { title: "Nieuws" };

type NewsItem = Database["public"]["Tables"]["news_items"]["Row"];

export default async function BeheerNieuwsPage() {
  await requireBoard();
  const supabase = await createClient();

  const { data: newsItems } = await supabase
    .from("news_items")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<NewsItem[]>();

  const urls = await getSignedStorageUrls(
    supabase,
    "news-images",
    (newsItems ?? []).flatMap((n) => (n.image_url ? [n.image_url] : []))
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Nieuws</h1>
        <p className="text-sm text-muted">
          Officiële mededelingen vanuit bestuur — staan los van de community-feed, bovenaan het dashboard en op de
          nieuwspagina voor alle leden.
        </p>
      </div>

      <NewsItemForm />

      {newsItems && newsItems.length > 0 ? (
        <div className="flex flex-col gap-2">
          {newsItems.map((item) => (
            <NewsItemRow key={item.id} item={item} imageUrl={item.image_url ? (urls.get(item.image_url) ?? null) : null} />
          ))}
        </div>
      ) : (
        <ComingSoon icon={Newspaper} title="Nog geen nieuwsberichten" description="Het eerste bericht verschijnt hier." />
      )}
    </div>
  );
}
