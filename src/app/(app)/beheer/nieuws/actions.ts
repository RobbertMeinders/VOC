"use server";

import { revalidatePath } from "next/cache";
import { requireBoard } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { removePreviousImage, uploadImage } from "@/lib/supabase/upload";
import { invalidateQuery } from "@/lib/cache/queryCache";
import { logAuditAction } from "@/lib/audit/log";

export type NewsFormState = { error?: string; success?: boolean };

// Dashboard (/) leest rechtstreeks, zonder cache, dus die hoeft hier niet
// expliciet gerevalideerd te worden — revalidatePath("/") dekt dat al.
function revalidateNews() {
  invalidateQuery("nieuws-page-data");
  revalidatePath("/nieuws");
  revalidatePath("/beheer/nieuws");
  revalidatePath("/");
}

export async function createNewsItemAction(_prevState: NewsFormState, formData: FormData): Promise<NewsFormState> {
  const profile = await requireBoard();

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !body) {
    return { error: "Titel en tekst zijn verplicht." };
  }

  const supabase = await createClient();

  // Nieuw bericht komt bovenaan (laagste position = eerst getoond), zoals
  // de oude created_at-desc-sortering ook altijd deed — een bestuurslid kan
  // het daarna zelf verplaatsen.
  const { data: topItem } = await supabase
    .from("news_items")
    .select("position")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();
  const position = topItem ? topItem.position - 1 : 0;

  const { data: newsItem, error } = await supabase
    .from("news_items")
    .insert({ title, subtitle: subtitle || null, body, created_by: profile.id, position })
    .select("id")
    .single();

  if (error || !newsItem) {
    return { error: "Plaatsen is niet gelukt. Probeer het opnieuw." };
  }

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const result = await uploadImage(supabase, "news-images", newsItem.id, image);
    if ("error" in result) return { error: result.error };
    await supabase.from("news_items").update({ image_url: result.path }).eq("id", newsItem.id);
  }

  await logAuditAction("news_item_created", "news_item", newsItem.id, { title });

  revalidateNews();
  return { success: true };
}

export async function updateNewsItemAction(
  newsItemId: string,
  _prevState: NewsFormState,
  formData: FormData
): Promise<NewsFormState> {
  await requireBoard();

  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !body) {
    return { error: "Titel en tekst zijn verplicht." };
  }

  const supabase = await createClient();

  let imagePath: string | undefined;
  let previousImageUrl: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const { data: existing } = await supabase
      .from("news_items")
      .select("image_url")
      .eq("id", newsItemId)
      .maybeSingle();
    previousImageUrl = existing?.image_url ?? null;

    const result = await uploadImage(supabase, "news-images", newsItemId, image);
    if ("error" in result) return { error: result.error };
    imagePath = result.path;
  }

  const { error } = await supabase
    .from("news_items")
    .update({ title, subtitle: subtitle || null, body, ...(imagePath ? { image_url: imagePath } : {}) })
    .eq("id", newsItemId);

  if (error) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  if (imagePath) {
    await removePreviousImage(supabase, "news-images", previousImageUrl);
  }

  await logAuditAction("news_item_updated", "news_item", newsItemId, { title });

  revalidateNews();
  return { success: true };
}

export async function moveNewsItemAction(newsItemId: string, direction: "up" | "down"): Promise<void> {
  await requireBoard();
  const supabase = await createClient();

  // Positie wisselen met de buur in die richting — een regel "hoger/lager
  // zetten" i.p.v. een losstaand sorteergetal te laten invullen.
  const { data: items } = await supabase
    .from("news_items")
    .select("id, position")
    .order("position", { ascending: true });

  if (!items) return;
  const index = items.findIndex((item) => item.id === newsItemId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swapWith = items[swapIndex];

  await Promise.all([
    supabase.from("news_items").update({ position: swapWith.position }).eq("id", current.id),
    supabase.from("news_items").update({ position: current.position }).eq("id", swapWith.id),
  ]);

  revalidateNews();
}

export async function deleteNewsItemAction(newsItemId: string): Promise<void> {
  await requireBoard();
  const supabase = await createClient();

  const { data: newsItem } = await supabase
    .from("news_items")
    .select("title, image_url")
    .eq("id", newsItemId)
    .maybeSingle();

  if (newsItem?.image_url) {
    await supabase.storage.from("news-images").remove([newsItem.image_url]);
  }
  await supabase.from("news_items").delete().eq("id", newsItemId);

  await logAuditAction("news_item_deleted", "news_item", newsItemId, { title: newsItem?.title ?? null });

  revalidateNews();
}
