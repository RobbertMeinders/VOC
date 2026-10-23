import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getSignedStorageUrls } from "@/lib/supabase/storage";
import { extractMentionedProfileIds } from "./mentions";
import type { FeedAttachment, FeedAuthor, FeedComment, FeedPost, FeedPostType } from "./types";

// likes/comment_likes zitten hier bewust niet in: die werden per rij met
// een geneste profiles-join opgehaald puur om te tellen en de meest
// recente liker te tonen — op een druk bericht met honderden likes dus
// honderden overbodige rijen per paginalading. get_feed_post_like_summaries/
// get_feed_comment_like_counts (0159) doen dat als één aggregatie per
// pagina i.p.v. per like-rij; zie attachLikeData hieronder.
const POST_SELECT = `
  id, author_id, content, type, created_at, updated_at,
  author:profiles!feed_posts_author_id_fkey(id, first_name, last_name, slug, avatar_url, anonymized_at),
  attachments:feed_attachments(id, type, storage_path, thumb_path, file_name),
  comments:feed_comments(
    id, post_id, content, created_at,
    author:profiles!feed_comments_author_id_fkey(id, first_name, last_name, avatar_url)
  )
`;

// slug/anonymized_at zijn optioneel: de reactie-auteur (hergebruikt ditzelfde
// type, zie buildComment) komt uit een losse select zonder die kolommen, en
// wordt nergens doorgeklikt -- een geanonimiseerd lid hoeft daar dus niet
// apart afgeschermd te worden.
type RawAuthor = {
  id: string;
  first_name: string;
  last_name: string;
  slug?: string;
  avatar_url: string | null;
  anonymized_at?: string | null;
};
type RawAttachment = { id: string; type: "image" | "pdf"; storage_path: string; thumb_path: string | null; file_name: string };
type RawComment = {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author: RawAuthor;
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
};

type PostLikeSummary = { likesCount: number; topLikerName: string | null };
type LikeData = {
  postSummaries: Map<string, PostLikeSummary>;
  commentCounts: Map<string, number>;
  likedPostIds: Set<string>;
  likedCommentIds: Set<string>;
};

// Eén aggregatie-call + twee lichte "wat heb ik zelf geliket"-calls voor de
// hele batch posts op deze pagina, i.p.v. de volledige like-rijen van elk
// bericht/elke reactie mee te sturen in de hoofdquery hierboven.
async function fetchLikeData(supabase: SupabaseClient<Database>, posts: RawPost[], viewerId: string): Promise<LikeData> {
  const postIds = posts.map((p) => p.id);
  const commentIds = posts.flatMap((p) => p.comments.map((c) => c.id));

  const [{ data: postSummaryRows }, { data: commentCountRows }, { data: myPostLikes }, { data: myCommentLikes }] = await Promise.all([
    postIds.length
      ? supabase.rpc("get_feed_post_like_summaries", { p_post_ids: postIds })
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? supabase.rpc("get_feed_comment_like_counts", { p_comment_ids: commentIds })
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("feed_likes").select("post_id").eq("profile_id", viewerId).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    commentIds.length
      ? supabase.from("feed_comment_likes").select("comment_id").eq("profile_id", viewerId).in("comment_id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const postSummaries = new Map<string, PostLikeSummary>(
    (postSummaryRows ?? []).map((row) => [
      row.post_id,
      {
        likesCount: row.likes_count,
        topLikerName: row.top_liker_first_name ? `${row.top_liker_first_name} ${row.top_liker_last_name}` : null,
      },
    ])
  );
  const commentCounts = new Map<string, number>((commentCountRows ?? []).map((row) => [row.comment_id, row.likes_count]));
  const likedPostIds = new Set<string>((myPostLikes ?? []).map((row) => row.post_id));
  const likedCommentIds = new Set<string>((myCommentLikes ?? []).map((row) => row.comment_id));

  return { postSummaries, commentCounts, likedPostIds, likedCommentIds };
}

// Alle "profiel:<uuid>"-id's uit @-vermeldingen in post- en reactie-content
// van deze batch, die inmiddels geanonimiseerd zijn — één query voor de hele
// pagina i.p.v. per bericht/reactie. Zie mentions.ts en MentionedText.tsx.
async function fetchAnonymizedMentionIds(supabase: SupabaseClient<Database>, posts: RawPost[]): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const post of posts) {
    if (post.content) for (const id of extractMentionedProfileIds(post.content)) ids.add(id);
    for (const comment of post.comments) {
      for (const id of extractMentionedProfileIds(comment.content)) ids.add(id);
    }
  }
  if (ids.size === 0) return new Set();

  const { data } = await supabase.from("profiles").select("id").in("id", Array.from(ids)).not("anonymized_at", "is", null);
  return new Set((data ?? []).map((row) => row.id));
}

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
      // Zelfde bucket, dus één gecombineerde batch i.p.v. een tweede
      // getSignedStorageUrls-aanroep — thumb_path en storage_path komen hier
      // gewoon samen in dezelfde Map terug (zie hydrateAll hieronder).
      if (attachment.thumb_path) attachmentPaths.add(attachment.thumb_path);
    }
  }

  return { avatarPaths: Array.from(avatarPaths), attachmentPaths: Array.from(attachmentPaths) };
}

function buildAuthor(author: RawAuthor, avatarUrls: Map<string, string>): FeedAuthor {
  return {
    id: author.id,
    first_name: author.first_name,
    last_name: author.last_name,
    slug: author.slug ?? author.id,
    avatarUrl: author.avatar_url ? (avatarUrls.get(author.avatar_url) ?? null) : null,
    anonymized: Boolean(author.anonymized_at),
  };
}

function buildAttachment(attachment: RawAttachment, mediaUrls: Map<string, string>): FeedAttachment {
  return {
    id: attachment.id,
    type: attachment.type,
    fileName: attachment.file_name,
    url: mediaUrls.get(attachment.storage_path) ?? null,
    thumbUrl: attachment.thumb_path ? (mediaUrls.get(attachment.thumb_path) ?? null) : null,
  };
}

function buildComment(
  comment: RawComment,
  likeData: LikeData,
  avatarUrls: Map<string, string>,
  anonymizedMentionIds: Set<string>
): FeedComment {
  return {
    id: comment.id,
    postId: comment.post_id,
    content: comment.content,
    createdAt: comment.created_at,
    author: buildAuthor(comment.author, avatarUrls),
    likesCount: likeData.commentCounts.get(comment.id) ?? 0,
    likedByMe: likeData.likedCommentIds.has(comment.id),
    anonymizedMentionIds: extractMentionedProfileIds(comment.content).filter((id) => anonymizedMentionIds.has(id)),
  };
}

function buildPost(
  post: RawPost,
  likeData: LikeData,
  avatarUrls: Map<string, string>,
  mediaUrls: Map<string, string>,
  anonymizedMentionIds: Set<string>
): FeedPost {
  const summary = likeData.postSummaries.get(post.id);
  return {
    id: post.id,
    content: post.content,
    type: post.type,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    author: buildAuthor(post.author, avatarUrls),
    attachments: post.attachments.map((a) => buildAttachment(a, mediaUrls)),
    comments: post.comments
      .map((c) => buildComment(c, likeData, avatarUrls, anonymizedMentionIds))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    likesCount: summary?.likesCount ?? 0,
    likedByMe: likeData.likedPostIds.has(post.id),
    likeSummary: {
      topLikerName: summary?.topLikerName ?? null,
      count: summary?.likesCount ?? 0,
    },
    anonymizedMentionIds: post.content ? extractMentionedProfileIds(post.content).filter((id) => anonymizedMentionIds.has(id)) : [],
  };
}

async function hydrateAll(supabase: SupabaseClient<Database>, posts: RawPost[], viewerId: string): Promise<FeedPost[]> {
  const { avatarPaths, attachmentPaths } = collectPaths(posts);
  const [avatarUrls, mediaUrls, likeData, anonymizedMentionIds] = await Promise.all([
    getSignedStorageUrls(supabase, "avatars", avatarPaths),
    getSignedStorageUrls(supabase, "feed-media", attachmentPaths),
    fetchLikeData(supabase, posts, viewerId),
    fetchAnonymizedMentionIds(supabase, posts),
  ]);

  return posts.map((post) => buildPost(post, likeData, avatarUrls, mediaUrls, anonymizedMentionIds));
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
    .range(offset, offset + limit - 1)
    .returns<RawPost[]>();

  return hydrateAll(supabase, data ?? [], viewerId);
}

// Lichte existence-check (geen volledige fetchFeedPostsByAuthor-ophaal) —
// gebruikt door de introductiestap in de onboarding (Home, /profiel) om te
// bepalen of een lid al een introductiebericht heeft geplaatst. De bron van
// waarheid is simpelweg of er al een feed_posts-rij met dit type bestaat,
// ongeacht via welke weg (deze stap, of gewoon de normale composer) die
// geplaatst is — zo blijft een al bestaande introductie altijd correct
// herkend, ook zonder aparte status-kolom die uit de pas kan gaan lopen.
export async function hasIntroductionPost(supabase: SupabaseClient<Database>, authorId: string): Promise<boolean> {
  const { data } = await supabase
    .from("feed_posts")
    .select("id")
    .eq("author_id", authorId)
    .eq("type", "voorstellen")
    .limit(1)
    .maybeSingle();
  return data !== null;
}

export async function fetchPostById(supabase: SupabaseClient<Database>, postId: string, viewerId: string): Promise<FeedPost | null> {
  const { data } = await supabase
    .from("feed_posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .order("created_at", { ascending: true, referencedTable: "feed_comments" })
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
      "id, post_id, content, created_at, author:profiles!feed_comments_author_id_fkey(id, first_name, last_name, avatar_url)"
    )
    .eq("id", commentId)
    .maybeSingle()
    .returns<RawComment>();

  if (!data) return null;

  const mentionedIds = extractMentionedProfileIds(data.content);
  const [avatarUrls, { data: countRows }, { data: myLike }, { data: anonymizedRows }] = await Promise.all([
    getSignedStorageUrls(supabase, "avatars", [data.author.avatar_url]),
    supabase.rpc("get_feed_comment_like_counts", { p_comment_ids: [commentId] }),
    supabase.from("feed_comment_likes").select("comment_id").eq("profile_id", viewerId).eq("comment_id", commentId).maybeSingle(),
    mentionedIds.length
      ? supabase.from("profiles").select("id").in("id", mentionedIds).not("anonymized_at", "is", null)
      : Promise.resolve({ data: [] }),
  ]);
  const likeData: LikeData = {
    postSummaries: new Map(),
    commentCounts: new Map((countRows ?? []).map((row) => [row.comment_id, row.likes_count])),
    likedPostIds: new Set(),
    likedCommentIds: new Set(myLike ? [myLike.comment_id] : []),
  };
  const anonymizedMentionIds = new Set((anonymizedRows ?? []).map((row) => row.id));

  return buildComment(data, likeData, avatarUrls, anonymizedMentionIds);
}
