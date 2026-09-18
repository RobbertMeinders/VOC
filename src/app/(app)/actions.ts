"use server";

import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fetchCommentById, fetchPostById } from "@/lib/feed/queries";
import type { FeedComment, FeedPost } from "@/lib/feed/types";

const ALLOWED_ATTACHMENT_TYPES: Record<string, "image" | "pdf"> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
};
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export type CreatePostState = { error?: string; success?: boolean; post?: FeedPost };

export async function createPostAction(_prevState: CreatePostState, formData: FormData): Promise<CreatePostState> {
  const profile = await requireProfile();
  const content = String(formData.get("content") ?? "").trim();

  if (!content) {
    return { error: "Schrijf een bericht voordat je het plaatst." };
  }

  const supabase = await createClient();

  const { data: newPost, error: postError } = await supabase
    .from("feed_posts")
    .insert({ author_id: profile.id, content })
    .select("id")
    .single();

  if (postError || !newPost) {
    return { error: "Plaatsen is niet gelukt. Probeer het opnieuw." };
  }

  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const attachmentType = ALLOWED_ATTACHMENT_TYPES[file.type];
    if (!attachmentType) {
      return { error: "Alleen afbeeldingen (PNG/JPEG/WebP) of PDF's zijn toegestaan als bijlage." };
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return { error: "De bijlage mag maximaal 15 MB zijn." };
    }

    const extension = file.name.split(".").pop() || (attachmentType === "pdf" ? "pdf" : "jpg");
    const path = `${profile.id}/${newPost.id}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("feed-media").upload(path, file, {
      contentType: file.type,
    });

    if (uploadError) {
      return { error: `Bericht geplaatst, maar de bijlage kon niet worden geüpload: ${uploadError.message}` };
    }

    await supabase.from("feed_attachments").insert({
      post_id: newPost.id,
      type: attachmentType,
      storage_path: path,
      file_name: file.name,
    });
  }

  const post = await fetchPostById(supabase, newPost.id, profile.id);
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

export async function getPostAction(postId: string): Promise<FeedPost | null> {
  const profile = await requireProfile();
  const supabase = await createClient();
  return fetchPostById(supabase, postId, profile.id);
}

export async function getCommentAction(commentId: string): Promise<FeedComment | null> {
  await requireProfile();
  const supabase = await createClient();
  return fetchCommentById(supabase, commentId);
}
