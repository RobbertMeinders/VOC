"use client";

import { useState } from "react";
import { OwnPostPreview } from "./OwnPostPreview";
import { MemberPostsOverlay } from "./MemberPostsOverlay";
import { MEMBER_PROFILE_LIST_PREVIEW } from "@/lib/feed/pagination";
import type { FeedPost } from "@/lib/feed/types";

// Alleen de eigen geplaatste berichten op het ledenprofiel. UX-review
// feedback-ronde 2 punt 10: geen 'vind ik leuk'/reageren hier meer (dat
// hoort bij de feed) - elk bericht is een kale preview die doorlinkt naar
// het echte bericht in de feed (OwnPostPreview). `initialPosts` komt van
// de server als MEMBER_PROFILE_LIST_PREVIEW + 1 - bij meer dan het
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
  const posts = initialPosts.slice(0, MEMBER_PROFILE_LIST_PREVIEW);
  const [showAll, setShowAll] = useState(false);
  const hasMore = initialPosts.length > MEMBER_PROFILE_LIST_PREVIEW;

  return (
    <>
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <OwnPostPreview key={post.id} post={post} />
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
