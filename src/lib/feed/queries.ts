import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getSignedStorageUrl } from "@/lib/supabase/storage";
import type { FeedAttachment, FeedAuthor, FeedComment, FeedPost } from "./types";

const POST_SELECT = `
  id, author_id, content, created_at,
  author:profiles!feed_posts_author_id_fkey(id, first_name, last_name, avatar_url),
  attachments:feed_attachments(id, type, storage_path, file_name),
  comments:feed_comments(
    id, post_id, content, created_at,
    author:profiles!feed_comments_author_id_fkey(id, first_name, last_name, avatar_url)
  ),
  likes:feed_likes(profile_id)
`;

type RawAuthor = { id: string; first_name: string; last_name: string; avatar_url: string | null };
type RawAttachment = { id: string; type: "image" | "pdf"; storage_path: string; file_name: string };
type RawComment = { id: string; post_id: string; content: string; created_at: string; author: RawAuthor };
type RawPost = {
  id: string;
  author_id: string;
  content: string | null;
  created_at: string;
  author: RawAuthor;
  attachments: RawAttachment[];
  comments: RawComment[];
  likes: { profile_id: string }[];
};

async function hydrateAuthor(author: RawAuthor): Promise<FeedAuthor> {
  return {
    id: author.id,
    first_name: author.first_name,
    last_name: author.last_name,
    avatarUrl: await getSignedStorageUrl("avatars", author.avatar_url),
  };
}

async function hydrateAttachment(attachment: RawAttachment): Promise<FeedAttachment> {
  return {
    id: attachment.id,
    type: attachment.type,
    fileName: attachment.file_name,
    url: await getSignedStorageUrl("feed-media", attachment.storage_path),
  };
}

async function hydrateComment(comment: RawComment): Promise<FeedComment> {
  return {
    id: comment.id,
    postId: comment.post_id,
    content: comment.content,
    createdAt: comment.created_at,
    author: await hydrateAuthor(comment.author),
  };
}

async function hydratePost(post: RawPost, viewerId: string): Promise<FeedPost> {
  const [author, attachments, comments] = await Promise.all([
    hydrateAuthor(post.author),
    Promise.all(post.attachments.map(hydrateAttachment)),
    Promise.all(post.comments.map(hydrateComment)),
  ]);

  return {
    id: post.id,
    content: post.content,
    createdAt: post.created_at,
    author,
    attachments,
    comments: comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    likesCount: post.likes.length,
    likedByMe: post.likes.some((like) => like.profile_id === viewerId),
  };
}

export async function fetchFeedPosts(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  limit = 20
): Promise<FeedPost[]> {
  const { data } = await supabase
    .from("feed_posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: true, referencedTable: "feed_comments" })
    .limit(limit)
    .returns<RawPost[]>();

  return Promise.all((data ?? []).map((post) => hydratePost(post, viewerId)));
}

export async function fetchPostById(
  supabase: SupabaseClient<Database>,
  postId: string,
  viewerId: string
): Promise<FeedPost | null> {
  const { data } = await supabase
    .from("feed_posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .order("created_at", { ascending: true, referencedTable: "feed_comments" })
    .maybeSingle()
    .returns<RawPost>();

  return data ? hydratePost(data, viewerId) : null;
}

export async function fetchCommentById(
  supabase: SupabaseClient<Database>,
  commentId: string
): Promise<FeedComment | null> {
  const { data } = await supabase
    .from("feed_comments")
    .select(
      "id, post_id, content, created_at, author:profiles!feed_comments_author_id_fkey(id, first_name, last_name, avatar_url)"
    )
    .eq("id", commentId)
    .maybeSingle()
    .returns<RawComment>();

  return data ? hydrateComment(data) : null;
}
