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
  const { data: newsItem, error } = await supabase
    .from("news_items")
    .insert({ title, subtitle: subtitle || null, body, created_by: profile.id })
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
