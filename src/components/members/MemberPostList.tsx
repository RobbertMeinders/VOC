"use client";

import { useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import { MemberPostsOverlay } from "./MemberPostsOverlay";
import { MEMBER_PROFILE_LIST_PREVIEW } from "@/lib/feed/pagination";
import type { FeedComment, FeedPost } from "@/lib/feed/types";

// Alleen de eigen geplaatste berichten op het ledenprofiel — zelfde
// PostCard/functionaliteit als de community-feed (likes, reacties, "meer
// weergeven"), maar zonder composer, filterchips of realtime-subscription:
// dit is een klein, gericht lijstje, geen tweede feed. `initialPosts` komt
// van de server als MEMBER_PROFILE_LIST_PREVIEW + 1 — bij meer dan het
// preview-aantal tonen we alleen de eerste paar met een "Bekijk alle"-knop
// die de volledige, doorscrollende lijst als overlay opent.
export function MemberPostList({
  memberId,
  initialPosts,
  currentUserId,
  canModerate,
  canEditOthers,
}: {
  memberId: string;
  initialPosts: FeedPost[];
  currentUserId: string;
  canModerate: boolean;
  canEditOthers: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts.slice(0, MEMBER_PROFILE_LIST_PREVIEW));
  const [showAll, setShowAll] = useState(false);
  const hasMore = initialPosts.length > MEMBER_PROFILE_LIST_PREVIEW;

  function removePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function updatePost(post: FeedPost) {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
  }

  function removeComment(commentId: string) {
    setPosts((prev) => prev.map((post) => ({ ...post, comments: post.comments.filter((c) => c.id !== commentId) })));
  }

  function updateComment(comment: FeedComment) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === comment.postId
          ? { ...post, comments: post.comments.map((c) => (c.id === comment.id ? comment : c)) }
          : post
      )
    );
  }

  if (posts.length === 0) {
    return <p className="text-sm text-muted">Nog geen berichten geplaatst.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            canModerate={canModerate}
            canEditOthers={canEditOthers}
            onDeleted={removePost}
            onUpdated={updatePost}
            onCommentDeleted={removeComment}
            onCommentUpdated={updateComment}
          />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-full border border-border py-2 text-center text-sm font-medium text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            Bekijk alle berichten
          </button>
        )}
      </div>

      {showAll && (
        <MemberPostsOverlay
          memberId={memberId}
          currentUserId={currentUserId}
          canModerate={canModerate}
          canEditOthers={canEditOthers}
          onClose={() => setShowAll(false)}
        />
      )}
    </>
  );
}
