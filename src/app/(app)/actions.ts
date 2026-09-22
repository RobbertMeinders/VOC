"use server";

import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { fetchCommentById, fetchPostById } from "@/lib/feed/queries";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import type { FeedComment, FeedPost, FeedPostType } from "@/lib/feed/types";
import type { FeedReportReason } from "@/lib/types/database";

const VALID_REPORT_REASONS: FeedReportReason[] = ["ongepast", "spam", "misleidend", "anders"];

const VALID_POST_TYPES: FeedPostType[] = ["vraag", "aanbod", "nieuws", "overig"];

function parsePostType(formData: FormData): FeedPostType | null {
  const value = String(formData.get("type") ?? "");
  return (VALID_POST_TYPES as string[]).includes(value) ? (value as FeedPostType) : null;
}

const ALLOWED_ATTACHMENT_TYPES: Record<string, "image" | "pdf"> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
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

  const postType = parsePostType(formData);
  if (!postType) {
    return { error: "Kies een label (vraag, aanbod, nieuws of overig) voordat je het bericht plaatst." };
  }

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

  const supabase = await createClient();

  const { data: newPost, error: postError } = await supabase
    .from("feed_posts")
    .insert({ author_id: profile.id, content, type: postType })
    .select("id")
    .single();

  if (postError || !newPost) {
    return { error: "Plaatsen is niet gelukt. Probeer het opnieuw." };
  }

  const attachmentRows: { post_id: string; type: "image" | "pdf"; storage_path: string; file_name: string }[] = [];

  for (const [index, file] of files.entries()) {
    const attachmentType = ALLOWED_ATTACHMENT_TYPES[file.type];
    const extension = file.name.split(".").pop() || (attachmentType === "pdf" ? "pdf" : "jpg");
    const path = `${profile.id}/${newPost.id}-${index}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("feed-media").upload(path, file, {
      contentType: file.type,
    });

    if (!uploadError) {
      attachmentRows.push({ post_id: newPost.id, type: attachmentType, storage_path: path, file_name: file.name });
    }
  }

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

export async function deletePostAction(postId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("feed_posts").delete().eq("id", postId);
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
    await supabase.from("feed_likes").delete().eq("id", existing.id);
    return { liked: false };
  }

  await supabase.from("feed_likes").insert({ post_id: postId, profile_id: profile.id });
  return { liked: true };
}

export type CreateCommentState = { error?: string; success?: boolean };

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
  const { error } = await supabase.from("feed_comments").insert({ post_id: postId, author_id: profile.id, content });

  if (error) {
    return { error: "Reageren is niet gelukt. Probeer het opnieuw." };
  }

  return { success: true };
}

export async function deleteCommentAction(commentId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("feed_comments").delete().eq("id", commentId);
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
    await supabase.from("feed_comment_likes").delete().eq("id", existing.id);
    return { liked: false };
  }

  await supabase.from("feed_comment_likes").insert({ comment_id: commentId, profile_id: profile.id });
  return { liked: true };
}

export type Liker = { id: string; firstName: string; lastName: string; avatarUrl: string | null };

export async function getPostLikersAction(postId: string): Promise<Liker[]> {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("feed_likes")
    .select("profile:profiles(id, first_name, last_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .returns<{ profile: { id: string; first_name: string; last_name: string; avatar_url: string | null } }[]>();

  return hydrateLikers(supabase, data ?? []);
}

export async function getCommentLikersAction(commentId: string): Promise<Liker[]> {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("feed_comment_likes")
    .select("profile:profiles(id, first_name, last_name, avatar_url)")
    .eq("comment_id", commentId)
    .order("created_at", { ascending: false })
    .returns<{ profile: { id: string; first_name: string; last_name: string; avatar_url: string | null } }[]>();

  return hydrateLikers(supabase, data ?? []);
}

async function hydrateLikers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: { profile: { id: string; first_name: string; last_name: string; avatar_url: string | null } }[]
): Promise<Liker[]> {
  const avatarUrls = await getSignedStorageUrls(supabase, "avatars", rows.map((r) => r.profile.avatar_url));
  return rows.map((r) => ({
    id: r.profile.id,
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

  return { success: true };
}
