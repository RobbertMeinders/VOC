"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCommentAction, getPostAction } from "@/app/(app)/actions";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";
import type { FeedAuthor, FeedPost } from "@/lib/feed/types";

export function FeedList({
  initialPosts,
  currentAuthor,
  canModerate,
}: {
  initialPosts: FeedPost[];
  currentAuthor: FeedAuthor;
  canModerate: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);

  function upsertPost(post: FeedPost) {
    setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]));
  }

  function removePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function upsertComment(comment: { id: string; postId: string } & Record<string, unknown>) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== comment.postId) return post;
        if (post.comments.some((c) => c.id === comment.id)) return post;
        return { ...post, comments: [...post.comments, comment as FeedPost["comments"][number]] };
      })
    );
  }

  function removeComment(commentId: string) {
    setPosts((prev) => prev.map((post) => ({ ...post, comments: post.comments.filter((c) => c.id !== commentId) })));
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("feed-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_posts" }, (payload) => {
        const postId = payload.new.id as string;
        getPostAction(postId).then((post) => post && upsertPost(post));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "feed_posts" }, (payload) => {
        removePost(payload.old.id as string);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feed_comments" }, (payload) => {
        const commentId = payload.new.id as string;
        getCommentAction(commentId).then((comment) => comment && upsertComment(comment));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "feed_comments" }, (payload) => {
        removeComment(payload.old.id as string);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <PostComposer author={currentAuthor} onCreated={upsertPost} />

      {posts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentAuthor.id}
              canModerate={canModerate}
              onDeleted={removePost}
              onCommentDeleted={removeComment}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <MessageSquare size={28} className="text-muted" />
          <p className="text-sm font-medium text-foreground">Nog geen berichten</p>
          <p className="max-w-xs text-sm text-muted">
            Zodra leden updates delen met het netwerk, verschijnen ze hier in de community-feed.
          </p>
        </div>
      )}
    </div>
  );
}
