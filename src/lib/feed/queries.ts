import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import type { FeedAttachment, FeedAuthor, FeedComment, FeedPost, FeedPostType } from "./types";

const POST_SELECT = `
  id, author_id, content, type, created_at, updated_at,
  author:profiles!feed_posts_author_id_fkey(id, first_name, last_name, avatar_url),
  attachments:feed_attachments(id, type, storage_path, file_name),
  comments:feed_comments(
    id, post_id, content, created_at,
    author:profiles!feed_comments_author_id_fkey(id, first_name, last_name, avatar_url),
    comment_likes:feed_comment_likes(profile_id)
  ),
  likes:feed_likes(profile_id, profile:profiles(first_name, last_name))
`;

type RawAuthor = { id: string; first_name: string; last_name: string; avatar_url: string | null };
type RawAttachment = { id: string; type: "image" | "pdf"; storage_path: string; file_name: string };
type RawLike = { profile_id: string; profile: { first_name: string; last_name: string } };
type RawComment = {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author: RawAuthor;
  comment_likes: { profile_id: string }[];
};
type RawPost = {
  id: string;
  author_id: string;
  content: string | null;
  type: FeedPostType | null;
  created_at: string;
  updated_at: string;
  author: RawAuthor;
  attachments: RawAttachment[];
  comments: RawComment[];
  likes: RawLike[];
};

// Collects every avatar/attachment path referenced by a batch of raw posts
// so callers can resolve them with a single signed-URL request per bucket,
// instead of one request per image (which times the page out once there
// are more than a handful of posts/comments).
function collectPaths(posts: RawPost[]) {
  const avatarPaths = new Set<string>();
  const attachmentPaths = new Set<string>();

  for (const post of posts) {
    if (post.author.avatar_url) avatarPaths.add(post.author.avatar_url);
    for (const comment of post.comments) {
      if (comment.author.avatar_url) avatarPaths.add(comment.author.avatar_url);
    }
    for (const attachment of post.attachments) {
      attachmentPaths.add(attachment.storage_path);
    }
  }

  return { avatarPaths: Array.from(avatarPaths), attachmentPaths: Array.from(attachmentPaths) };
}

function buildAuthor(author: RawAuthor, avatarUrls: Map<string, string>): FeedAuthor {
  return {
    id: author.id,
    first_name: author.first_name,
    last_name: author.last_name,
    avatarUrl: author.avatar_url ? (avatarUrls.get(author.avatar_url) ?? null) : null,
  };
}

function buildAttachment(attachment: RawAttachment, mediaUrls: Map<string, string>): FeedAttachment {
  return {
    id: attachment.id,
    type: attachment.type,
    fileName: attachment.file_name,
    url: mediaUrls.get(attachment.storage_path) ?? null,
  };
}

function buildComment(comment: RawComment, viewerId: string, avatarUrls: Map<string, string>): FeedComment {
  return {
    id: comment.id,
    postId: comment.post_id,
    content: comment.content,
    createdAt: comment.created_at,
    author: buildAuthor(comment.author, avatarUrls),
    likesCount: comment.comment_likes.length,
    likedByMe: comment.comment_likes.some((like) => like.profile_id === viewerId),
  };
}

function buildPost(post: RawPost, viewerId: string, avatarUrls: Map<string, string>, mediaUrls: Map<string, string>): FeedPost {
  // post.likes komt binnen op created_at desc (zie .order(..., { referencedTable: "feed_likes" })
  // hieronder), dus likes[0] is de meest recente liker — voor "Naam en N anderen".
  const topLiker = post.likes[0]?.profile ?? null;
  return {
    id: post.id,
    content: post.content,
    type: post.type,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    author: buildAuthor(post.author, avatarUrls),
    attachments: post.attachments.map((a) => buildAttachment(a, mediaUrls)),
    comments: post.comments
      .map((c) => buildComment(c, viewerId, avatarUrls))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    likesCount: post.likes.length,
    likedByMe: post.likes.some((like) => like.profile_id === viewerId),
    likeSummary: {
      topLikerName: topLiker ? `${topLiker.first_name} ${topLiker.last_name}` : null,
      count: post.likes.length,
    },
  };
}

async function hydrateAll(supabase: SupabaseClient<Database>, posts: RawPost[], viewerId: string): Promise<FeedPost[]> {
  const { avatarPaths, attachmentPaths } = collectPaths(posts);
  const [avatarUrls, mediaUrls] = await Promise.all([
    getSignedStorageUrls(supabase, "avatars", avatarPaths),
    getSignedStorageUrls(supabase, "feed-media", attachmentPaths),
  ]);

  return posts.map((post) => buildPost(post, viewerId, avatarUrls, mediaUrls));
}

export async function fetchFeedPosts(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  limit = 20,
  offset = 0
): Promise<FeedPost[]> {
  const { data } = await supabase
    .from("feed_posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: true, referencedTable: "feed_comments" })
    .order("created_at", { ascending: false, referencedTable: "feed_likes" })
    .range(offset, offset + limit - 1)
    .returns<RawPost[]>();

  return hydrateAll(supabase, data ?? [], viewerId);
}

// Eigen berichten op het ledenprofiel — zelfde weergave/select als de
// community-feed, maar begrensd tot wat deze auteur zelf heeft geplaatst
// (geen reacties of likes van/op anderen).
export async function fetchFeedPostsByAuthor(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  authorId: string,
  limit = 20,
  offset = 0
): Promise<FeedPost[]> {
  const { data } = await supabase
    .from("feed_posts")
    .select(POST_SELECT)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: true, referencedTable: "feed_comments" })
    .order("created_at", { ascending: false, referencedTable: "feed_likes" })
    .range(offset, offset + limit - 1)
    .returns<RawPost[]>();

  return hydrateAll(supabase, data ?? [], viewerId);
}

export async function fetchPostById(supabase: SupabaseClient<Database>, postId: string, viewerId: string): Promise<FeedPost | null> {
  const { data } = await supabase
    .from("feed_posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .order("created_at", { ascending: true, referencedTable: "feed_comments" })
    .order("created_at", { ascending: false, referencedTable: "feed_likes" })
    .maybeSingle()
    .returns<RawPost>();

  if (!data) return null;
  const [post] = await hydrateAll(supabase, [data], viewerId);
  return post;
}

export async function fetchCommentById(
  supabase: SupabaseClient<Database>,
  commentId: string,
  viewerId: string
): Promise<FeedComment | null> {
  const { data } = await supabase
    .from("feed_comments")
    .select(
      "id, post_id, content, created_at, author:profiles!feed_comments_author_id_fkey(id, first_name, last_name, avatar_url), comment_likes:feed_comment_likes(profile_id)"
    )
    .eq("id", commentId)
    .maybeSingle()
    .returns<RawComment>();

  if (!data) return null;
  const avatarUrls = await getSignedStorageUrls(supabase, "avatars", [data.author.avatar_url]);
  return buildComment(data, viewerId, avatarUrls);
}
