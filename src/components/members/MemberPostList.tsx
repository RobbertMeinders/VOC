"use client";

import { useState } from "react";
import { PostCard } from "@/components/feed/PostCard";
import type { FeedComment, FeedPost } from "@/lib/feed/types";

// Alleen de eigen geplaatste berichten op het ledenprofiel — zelfde
// PostCard/functionaliteit als de community-feed (likes, reacties, "meer
// weergeven"), maar zonder composer, filterchips of realtime-subscription:
// dit is een klein, gericht lijstje, geen tweede feed.
export function MemberPostList({
  initialPosts,
  currentUserId,
  canModerate,
  canEditOthers,
}: {
  initialPosts: FeedPost[];
  currentUserId: string;
  canModerate: boolean;
  canEditOthers: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);

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
    </div>
  );
}
