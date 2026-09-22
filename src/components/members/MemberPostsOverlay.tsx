"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import { useInfiniteScroll } from "@/lib/dom/useInfiniteScroll";
import { PostCard } from "@/components/feed/PostCard";
import { getMemberPostsPageAction } from "@/app/(app)/leden/[id]/list-actions";
import { MEMBER_PROFILE_LIST_PAGE_SIZE } from "@/lib/feed/pagination";
import type { FeedComment, FeedPost } from "@/lib/feed/types";

// Haalt bij het openen zijn eigen eerste pagina op (i.p.v. de kleine
// preview-batch van de profielpagina te hergebruiken) — anders zou "heeft
// deze lijst meer dan de preview" verward raken met "heeft deze lijst meer
// dan een volledige overlay-pagina".
export function MemberPostsOverlay({
  memberId,
  currentUserId,
  canModerate,
  canEditOthers,
  onClose,
}: {
  memberId: string;
  currentUserId: string;
  canModerate: boolean;
  canEditOthers: boolean;
  onClose: () => void;
}) {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, startLoading] = useTransition();

  useEscapeKey(true, onClose);
  useBodyScrollLock(true);

  useEffect(() => {
    void getMemberPostsPageAction(memberId, 0).then((first) => {
      setPosts(first);
      if (first.length < MEMBER_PROFILE_LIST_PAGE_SIZE) setHasMore(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadMore() {
    if (isLoading || posts === null) return;
    startLoading(async () => {
      const next = await getMemberPostsPageAction(memberId, posts.length);
      setPosts((prev) => [...(prev ?? []), ...next]);
      if (next.length < MEMBER_PROFILE_LIST_PAGE_SIZE) setHasMore(false);
    });
  }

  const sentinelRef = useInfiniteScroll(loadMore, hasMore && posts !== null);

  function removePost(postId: string) {
    setPosts((prev) => (prev ? prev.filter((p) => p.id !== postId) : prev));
  }
  function updatePost(post: FeedPost) {
    setPosts((prev) => (prev ? prev.map((p) => (p.id === post.id ? post : p)) : prev));
  }
  function removeComment(commentId: string) {
    setPosts((prev) =>
      prev ? prev.map((post) => ({ ...post, comments: post.comments.filter((c) => c.id !== commentId) })) : prev
    );
  }
  function updateComment(comment: FeedComment) {
    setPosts((prev) =>
      prev
        ? prev.map((post) =>
            post.id === comment.postId
              ? { ...post, comments: post.comments.map((c) => (c.id === comment.id ? comment : c)) }
              : post
          )
        : prev
    );
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-background pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Alle berichten</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-black/[.04] hover:text-voc-red dark:hover:bg-white/[.08]"
        >
          <X size={16} />
        </button>
      </div>
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 overflow-y-auto p-4">
        {posts === null && <p className="py-6 text-center text-sm text-muted">Laden…</p>}
        {posts?.map((post) => (
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
        {hasMore && posts !== null && (
          <div ref={sentinelRef} className="py-3 text-center text-xs text-muted">
            {isLoading ? "Meer berichten laden…" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
