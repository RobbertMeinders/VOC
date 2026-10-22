"use server";

import { after } from "next/server";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { fetchCommentById, fetchFeedPosts, fetchPostById } from "@/lib/feed/queries";
import { FEED_PAGE_SIZE } from "@/lib/feed/pagination";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { logEvent } from "@/lib/events/log";
import { dispatchPendingPushNotifications } from "@/lib/notifications/dispatch-push";
import type { FeedComment, FeedPost, FeedPostType } from "@/lib/feed/types";
import type { FeedReportReason } from "@/lib/types/database";

const VALID_REPORT_REASONS: FeedReportReason[] = ["ongepast", "spam", "misleidend", "anders"];

// 'overig' is hier bewust nog toegestaan: niet langer zelf-kiesbaar in de
// composer (zie COMPOSER_POST_TYPES in lib/feed/postType.ts), maar bestaand
// zo-gelabelde berichten moeten geldig blijven als ze zonder wijziging aan
// het label opnieuw opgeslagen worden (bewerken).
const VALID_POST_TYPES: FeedPostType[] = ["vraag", "aanbod", "nieuws", "overig", "voorstellen"];
// Zelfde letterlijke waarde als NO_POST_TYPE_VALUE in PostComposer.tsx —
// de composer stuurt dit mee als bewuste keuze voor "geen categorie"
// ("Iets anders"), te onderscheiden van nog helemaal niets gekozen hebben.
const NO_POST_TYPE_VALUE = "geen";

// Voor bewerken (optioneel): elke niet-herkende waarde (incl. leeg) is
// gewoon "geen label".
function parsePostType(formData: FormData): FeedPostType | null {
  const value = String(formData.get("type") ?? "");
  return (VALID_POST_TYPES as string[]).includes(value) ? (value as FeedPostType) : null;
}

// Voor een nieuw bericht (verplicht): PostTypeChooser dwingt een keuze af
// vóór de tekst-stap, inclusief "Iets anders" (NO_POST_TYPE_VALUE). Alleen
// als het veld geen van beide is, is er niets gekozen (bv. een handmatige
// request zonder de composer) — dat blijft een harde fout.
function parseRequiredPostTypeChoice(formData: FormData): { made: boolean; type: FeedPostType | null } {
  const value = String(formData.get("type") ?? "");
  if (value === NO_POST_TYPE_VALUE) return { made: true, type: null };
  if ((VALID_POST_TYPES as string[]).includes(value)) return { made: true, type: value as FeedPostType };
  return { made: false, type: null };
}

const ALLOWED_ATTACHMENT_TYPES: Record<string, "image" | "pdf"> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
};
// Extensie voor het storage-pad hieronder — uit het al tegen de allowlist
// hierboven gevalideerde file.type i.p.v. uit file.name: dat laatste is
// client-gestuurd (een server action is rechtstreeks aan te roepen buiten
// de echte <input type=file> om) en kan dus bijna elke string bevatten,
// inclusief een "/"-teken als de naam geen punt bevat (split(".").pop()
// geeft dan de hele naam terug) — dat zou een extra padsegment in de
// storage-sleutel injecteren.
const ATTACHMENT_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;

export type CreatePostState = { error?: string; success?: boolean; post?: FeedPost };

export async function createPostAction(_prevState: CreatePostState, formData: FormData): Promise<CreatePostState> {
  const profile = await requireProfile();
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "Schrijf een bericht voordat je het plaatst." };
  }

  const postTypeChoice = parseRequiredPostTypeChoice(formData);
  if (!postTypeChoice.made) {
    return { error: "Kies eerst wat voor bericht dit is voordat je het plaatst." };
  }
  const postType = postTypeChoice.type;

  const files = formData.getAll("attachments").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_ATTACHMENTS) {
    return { error: `Je kunt maximaal ${MAX_ATTACHMENTS} bestanden toevoegen.` };
  }
  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_TYPES[file.type]) {
      return { error: "Alleen afbeeldingen (PNG/JPEG/WebP) of PDF's zijn toegestaan als bijlage." };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: "Elke bijlage mag maximaal 15 MB zijn." };
    }
  }
  // 1-op-1 op positie gekoppeld aan `files` hierboven (zie PostComposer's
  // buildThumbFileList) — een lege (0 bytes) placeholder op de positie van
  // een PDF of een mislukte thumbnail, nooit een kortere lijst.
  const thumbFiles = formData.getAll("attachment_thumbs").filter((f): f is File => f instanceof File);

  const supabase = await createClient();

  const { data: newPost, error: postError } = await supabase
    .from("feed_posts")
    .insert({ author_id: profile.id, content, type: postType })
    .select("id")
    .single();

  if (postError || !newPost) {
    return { error: "Plaatsen is niet gelukt. Probeer het opnieuw." };
  }

  // Uploads parallelliseren i.p.v. één voor één wachten — bij het maximum
  // van 10 bijlagen scheelde dat tot 10 sequentiële Storage-round-trips.
  const uploads = await Promise.all(
    files.map(async (file, index) => {
      const attachmentType = ALLOWED_ATTACHMENT_TYPES[file.type];
      const extension = ATTACHMENT_EXTENSIONS[file.type];
      const path = `${profile.id}/${newPost.id}-${index}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("feed-media").upload(path, file, {
        contentType: file.type,
      });
      if (uploadError) return null;

      // De placeholder op deze positie is 0 bytes (PDF, of een client-side
      // mislukte thumbnail) — dan gewoon geen thumb_path, de feed valt dan
      // terug op het volledige bestand (zie AttachmentCarousel).
      let thumbPath: string | null = null;
      const thumbFile = thumbFiles[index];
      if (thumbFile && thumbFile.size > 0) {
        const thumbExtension = thumbFile.type === "image/png" ? "png" : "jpg";
        const candidatePath = `${profile.id}/${newPost.id}-${index}-thumb.${thumbExtension}`;
        const { error: thumbError } = await supabase.storage.from("feed-media").upload(candidatePath, thumbFile, {
          contentType: thumbFile.type,
        });
        if (!thumbError) thumbPath = candidatePath;
      }

      return { post_id: newPost.id, type: attachmentType, storage_path: path, thumb_path: thumbPath, file_name: file.name };
    })
  );
  const attachmentRows = uploads.filter((row): row is NonNullable<typeof row> => row !== null);

  if (attachmentRows.length > 0) {
    await supabase.from("feed_attachments").insert(attachmentRows);
  }

  const post = await fetchPostById(supabase, newPost.id, profile.id);
  return { success: true, post: post ?? undefined };
}

export type UpdatePostState = { error?: string; success?: boolean; post?: FeedPost };

export async function updatePostAction(
  postId: string,
  _prevState: UpdatePostState,
  formData: FormData
): Promise<UpdatePostState> {
  const profile = await requireProfile();
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "Een bericht kan niet leeg zijn." };
  }

  const supabase = await createClient();
  let query = supabase.from("feed_posts").update({ content, type: parsePostType(formData) }).eq("id", postId);
  if (!isAdmin(profile.role)) {
    query = query.eq("author_id", profile.id);
  }
  const { data, error } = await query.select("id").maybeSingle();

  if (error || !data) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  const post = await fetchPostById(supabase, postId, profile.id);
  return { success: true, post: post ?? undefined };
}

export async function deletePostAction(postId: string): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();
  // delete_feed_post (M11) i.p.v. een rechtstreekse DELETE: de ON DELETE
  // CASCADE naar feed_post_reports mag niet meer via een brede RLS-regel
  // die ook losse report-deletes toestaat (zie de migratie) — deze
  // SECURITY DEFINER-functie doet zelf de autorisatiecheck en bypasst RLS
  // voor de cascade.
  const { error } = await supabase.rpc("delete_feed_post", { p_id: postId });
  if (error) {
    return { error: "Verwijderen is niet gelukt. Probeer het opnieuw." };
  }
  return {};
}

export async function toggleLikeAction(postId: string): Promise<{ liked: boolean }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("feed_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("feed_likes").delete().eq("id", existing.id);
    if (error) throw new Error("Vind-ik-leuk verwijderen is niet gelukt.");
    return { liked: false };
  }

  const { error } = await supabase.from("feed_likes").insert({ post_id: postId, profile_id: profile.id });
  if (error) throw new Error("Vind-ik-leuk is niet gelukt.");
  return { liked: true };
}

export type CreateCommentState = { error?: string; success?: boolean; comment?: FeedComment };

export async function createCommentAction(
  postId: string,
  _prevState: CreateCommentState,
  formData: FormData
): Promise<CreateCommentState> {
  const profile = await requireProfile();
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "Schrijf een reactie." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feed_comments")
    .insert({ post_id: postId, author_id: profile.id, content })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Reageren is niet gelukt. Probeer het opnieuw." };
  }

  // UX-review punt 2: notify_on_feed_comment/dispatch_mention_notifications
  // zetten net een notifications-rij voor de auteur (en eventueel getagde
  // leden) — direct dispatchen i.p.v. tot de volgende cron-run wachten.
  after(() => dispatchPendingPushNotifications(10));

  // Performance-audit E6: de reactie meteen teruggeven i.p.v. te wachten tot
  // de eigen realtime-subscriptie 'm terugkrijgt — dat voelde voor de
  // plaatser zelf traag ("omweg via realtime"), en kost zonder dit altijd
  // een extra round-trip (getCommentAction) bovenop de insert hierboven.
  const comment = await fetchCommentById(supabase, data.id, profile.id);
  return { success: true, comment: comment ?? undefined };
}

export async function deleteCommentAction(commentId: string): Promise<{ error?: string }> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("feed_comments").delete().eq("id", commentId);
  if (error) {
    return { error: "Verwijderen is niet gelukt. Probeer het opnieuw." };
  }
  return {};
}

export type UpdateCommentState = { error?: string; success?: boolean; comment?: FeedComment };

export async function updateCommentAction(
  commentId: string,
  _prevState: UpdateCommentState,
  formData: FormData
): Promise<UpdateCommentState> {
  const profile = await requireProfile();
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "Een reactie kan niet leeg zijn." };
  }

  const supabase = await createClient();
  let query = supabase.from("feed_comments").update({ content }).eq("id", commentId);
  if (!isAdmin(profile.role)) {
    query = query.eq("author_id", profile.id);
  }
  const { data, error } = await query.select("id").maybeSingle();

  if (error || !data) {
    return { error: "Opslaan is niet gelukt. Probeer het opnieuw." };
  }

  const comment = await fetchCommentById(supabase, commentId, profile.id);
  return { success: true, comment: comment ?? undefined };
}

export async function getPostAction(postId: string): Promise<FeedPost | null> {
  const profile = await requireProfile();
  const supabase = await createClient();
  return fetchPostById(supabase, postId, profile.id);
}

export async function getCommentAction(commentId: string): Promise<FeedComment | null> {
  const profile = await requireProfile();
  const supabase = await createClient();
  return fetchCommentById(supabase, commentId, profile.id);
}

export async function toggleCommentLikeAction(commentId: string): Promise<{ liked: boolean }> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("feed_comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("feed_comment_likes").delete().eq("id", existing.id);
    if (error) throw new Error("Vind-ik-leuk verwijderen is niet gelukt.");
    return { liked: false };
  }

  const { error } = await supabase.from("feed_comment_likes").insert({ comment_id: commentId, profile_id: profile.id });
  if (error) throw new Error("Vind-ik-leuk is niet gelukt.");
  return { liked: true };
}

export type Liker = { id: string; slug: string; firstName: string; lastName: string; avatarUrl: string | null };

export async function getPostLikersAction(postId: string): Promise<Liker[]> {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("feed_likes")
    .select("profile:profiles(id, first_name, last_name, slug, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .returns<{ profile: { id: string; first_name: string; last_name: string; slug: string; avatar_url: string | null } }[]>();

  return hydrateLikers(supabase, data ?? []);
}

export async function getCommentLikersAction(commentId: string): Promise<Liker[]> {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("feed_comment_likes")
    .select("profile:profiles(id, first_name, last_name, slug, avatar_url)")
    .eq("comment_id", commentId)
    .order("created_at", { ascending: false })
    .returns<{ profile: { id: string; first_name: string; last_name: string; slug: string; avatar_url: string | null } }[]>();

  return hydrateLikers(supabase, data ?? []);
}

async function hydrateLikers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: { profile: { id: string; first_name: string; last_name: string; slug: string; avatar_url: string | null } }[]
): Promise<Liker[]> {
  const avatarUrls = await getSignedStorageUrls(supabase, "avatars", rows.map((r) => r.profile.avatar_url));
  return rows.map((r) => ({
    id: r.profile.id,
    slug: r.profile.slug,
    firstName: r.profile.first_name,
    lastName: r.profile.last_name,
    avatarUrl: r.profile.avatar_url ? (avatarUrls.get(r.profile.avatar_url) ?? null) : null,
  }));
}

export type MentionSuggestion = { id: string; name: string; imageUrl: string | null };
export type MentionSearchResult = { profiles: MentionSuggestion[]; companies: MentionSuggestion[] };

// Client-side-style filter over the (small) member/company lists, same
// approach as /zoeken — cheap enough at this org's size, and avoids a
// separate ilike query per keystroke. Only id/name(+image path) are
// fetched, so the payload stays small even as membership grows.
export async function searchMentionsAction(query: string): Promise<MentionSearchResult> {
  await requireProfile();
  const q = query.trim().toLowerCase();
  if (!q) return { profiles: [], companies: [] };

  const supabase = await createClient();
  const [{ data: profileRows }, { data: companyRows }] = await Promise.all([
    supabase.from("profiles").select("id, first_name, last_name, avatar_url").eq("is_active", true),
    supabase.from("companies").select("id, name, logo_url"),
  ]);

  const matchedProfiles = (profileRows ?? [])
    .filter((p) => `${p.first_name} ${p.last_name}`.toLowerCase().includes(q))
    .slice(0, 5);
  const matchedCompanies = (companyRows ?? []).filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);

  const [avatarUrls, logoUrls] = await Promise.all([
    getSignedStorageUrls(supabase, "avatars", matchedProfiles.map((p) => p.avatar_url)),
    getSignedStorageUrls(supabase, "company-logos", matchedCompanies.map((c) => c.logo_url)),
  ]);

  const profiles = matchedProfiles.map((p) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    imageUrl: p.avatar_url ? (avatarUrls.get(p.avatar_url) ?? null) : null,
  }));
  const companies = matchedCompanies.map((c) => ({
    id: c.id,
    name: c.name,
    imageUrl: c.logo_url ? (logoUrls.get(c.logo_url) ?? null) : null,
  }));

  return { profiles, companies };
}

export async function loadMoreFeedPostsAction(offset: number): Promise<FeedPost[]> {
  const profile = await requireProfile();
  const supabase = await createClient();
  return fetchFeedPosts(supabase, profile.id, FEED_PAGE_SIZE, offset);
}

// Alleen aangeroepen als iemand via een ?highlight-link (notificatie of
// gedeelde link) een specifiek bericht opent — dat is een betekenisvollere
// "bekeken"-gebeurtenis dan elk bericht dat toevallig voorbijscrolt in de
// feed loggen (zie FeedList).
export async function logPostViewAction(postId: string): Promise<void> {
  await logEvent("post_viewed", "post", postId);
}

// Client-heartbeat (zie OnlineHeartbeat) — houdt last_active_at actueel
// zolang het tabblad open/zichtbaar is, i.p.v. alleen bij login, zodat
// beheer een echte "nu online"-teller kan tonen (zie beheer/page.tsx).
export async function heartbeatAction() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", profile.id);
}

export type ReportPostState = { error?: string; success?: boolean };

export async function reportPostAction(
  postId: string,
  reason: string,
  details: string
): Promise<ReportPostState> {
  const profile = await requireProfile();

  if (!(VALID_REPORT_REASONS as string[]).includes(reason)) {
    return { error: "Kies een geldige reden." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("feed_post_reports").insert({
    post_id: postId,
    reporter_id: profile.id,
    reason: reason as FeedReportReason,
    details: details.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Je hebt dit bericht al gerapporteerd." };
    }
    return { error: "Rapporteren is niet gelukt. Probeer het opnieuw." };
  }

  // notify_feed_post_report zet net een notifications-rij voor bestuur/
  // beheer — zonder dit wachtte de pushmelding tot de volgende dagelijkse
  // cron-run i.p.v. binnen enkele seconden aan te komen (zelfde reden als
  // bij createCommentAction hierboven).
  after(() => dispatchPendingPushNotifications(10));

  return { success: true };
}
