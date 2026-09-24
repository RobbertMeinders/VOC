"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { clsx } from "clsx";
import { createClient } from "@/lib/supabase/client";
import { getCommentAction, getPostAction, loadMoreFeedPostsAction, logPostViewAction } from "@/app/(app)/actions";
import { FEED_PAGE_SIZE } from "@/lib/feed/pagination";
import { useInfiniteScroll } from "@/lib/dom/useInfiniteScroll";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";
import { POST_TYPES, POST_TYPE_LABELS } from "@/lib/feed/postType";
import type { FeedAuthor, FeedComment, FeedPost, FeedPostType } from "@/lib/feed/types";

type Filter = "alle" | FeedPostType;

export function FeedList({
  initialPosts,
  currentAuthor,
  canModerate,
  canEditOthers,
}: {
  initialPosts: FeedPost[];
  currentAuthor: FeedAuthor;
  canModerate: boolean;
  canEditOthers: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState<Filter>("alle");
  // Server geeft de eerste FEED_PAGE_SIZE berichten mee — minder dan dat
  // betekent dat er al bij de eerste render niets meer te laden viel.
  const [hasMore, setHasMore] = useState(initialPosts.length >= FEED_PAGE_SIZE);
  const [isLoadingMore, startLoadingMore] = useTransition();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const visiblePosts = filter === "alle" ? posts : posts.filter((p) => p.type === filter);

  function loadMore() {
    if (isLoadingMore) return;
    startLoadingMore(async () => {
      const next = await loadMoreFeedPostsAction(posts.length);
      setPosts((prev) => [...prev, ...next.filter((p) => !prev.some((existing) => existing.id === p.id))]);
      if (next.length < FEED_PAGE_SIZE) setHasMore(false);
    });
  }

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && filter === "alle");

  function upsertPost(post: FeedPost) {
    setPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]));
  }

  function removePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function updatePost(post: FeedPost) {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
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

  function updateComment(comment: FeedComment) {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === comment.postId
          ? { ...post, comments: post.comments.map((c) => (c.id === comment.id ? comment : c)) }
          : post
      )
    );
  }

  // Een notificatie (nieuwe reactie, of @genoemd in een bericht/reactie)
  // linkt naar /community?highlight=<post_id of comment_id> — spring naar
  // dat element en geef 'm even een kleurtje, zodat je meteen ziet waar het
  // om ging (PostCard opent de comments van dat bericht al via
  // forceCommentsOpen, dus een reactie-element staat er al bij eerste render).
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`comment-${highlightId}`) ?? document.getElementById(`post-${highlightId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-voc-red", "rounded-xl");
    const timeout = setTimeout(() => el.classList.remove("ring-2", "ring-voc-red", "rounded-xl"), 3000);
    return () => clearTimeout(timeout);
  }, [highlightId]);

  useEffect(() => {
    if (!highlightId) return;
    // highlightId kan een post- of een comment-id zijn (zie hierboven) —
    // in beide gevallen telt dat als een view van het bericht zelf.
    const highlightedPost = posts.find((p) => p.id === highlightId || p.comments.some((c) => c.id === highlightId));
    if (highlightedPost) logPostViewAction(highlightedPost.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- alleen bij een nieuwe highlightId opnieuw loggen, niet bij elke posts-wijziging
  }, [highlightId]);

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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "feed_posts" }, (payload) => {
        const postId = payload.new.id as string;
        getPostAction(postId).then((post) => post && updatePost(post));
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

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setFilter("alle")}
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            filter === "alle" ? "bg-voc-red text-white" : "bg-black/[.06] text-muted hover:bg-black/[.1] dark:bg-white/[.08]"
          )}
        >
          Alles
        </button>
        {POST_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={clsx(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              filter === type ? "bg-voc-red text-white" : "bg-black/[.06] text-muted hover:bg-black/[.1] dark:bg-white/[.08]"
            )}
          >
            {POST_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {visiblePosts.length > 0 ? (
        <div className="flex flex-col gap-4">
          {visiblePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentAuthor.id}
              canModerate={canModerate}
              canEditOthers={canEditOthers}
              onDeleted={removePost}
              onUpdated={updatePost}
              onCommentDeleted={removeComment}
              onCommentUpdated={updateComment}
              forceCommentsOpen={highlightId ? post.comments.some((c) => c.id === highlightId) : false}
            />
          ))}
          {filter === "alle" && hasMore && (
            <div ref={sentinelRef} className="py-4 text-center text-xs text-muted">
              {isLoadingMore ? "Meer berichten laden…" : ""}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
          <MessageSquare size={28} className="text-muted" />
          <p className="text-sm font-medium text-foreground">
            {posts.length === 0 ? "Nog geen berichten" : `Geen berichten met label "${POST_TYPE_LABELS[filter as FeedPostType]}"`}
          </p>
          <p className="max-w-xs text-sm text-muted">
            {posts.length === 0
              ? "Zodra leden updates delen met het netwerk, verschijnen ze hier in de community-feed."
              : "Probeer een ander label, of bekijk alle berichten."}
          </p>
        </div>
      )}
    </div>
  );
}
