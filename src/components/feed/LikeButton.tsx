"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { clsx } from "clsx";

// Generiek duimpje voor zowel berichten als reacties — de aanroepende
// component levert de toggle-server-action (toggleLikeAction/
// toggleCommentLikeAction) en de eigen id.
export function LikeButton({
  targetId,
  initialLiked,
  toggleAction,
  onToggled,
  size = "md",
}: {
  targetId: string;
  initialLiked: boolean;
  toggleAction: (id: string) => Promise<{ liked: boolean }>;
  onToggled?: () => void;
  size?: "sm" | "md";
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const nextLiked = !liked;
    setLiked(nextLiked);

    startTransition(async () => {
      try {
        const result = await toggleAction(targetId);
        if (result.liked !== nextLiked) setLiked(result.liked);
        // Het "1 vind-ik-leuk · 2 reacties"-samenvattingsregeltje bij een
        // bericht leest de server-data van de post, niet deze lokale
        // like-state — zonder deze callback zag je jezelf daar pas na een
        // refresh bij staan.
        onToggled?.();
      } catch {
        setLiked(!nextLiked);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={liked ? "Niet meer leuk vinden" : "Vind ik leuk"}
      aria-pressed={liked}
      className={clsx(
        "flex items-center gap-1.5 rounded-full font-medium transition-colors",
        size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
        liked ? "text-voc-red-text" : "text-muted hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      )}
    >
      <ThumbsUp key={String(liked)} size={size === "sm" ? 13 : 16} className={clsx(liked && "fill-voc-red animate-pop")} />
      {/* Afwerkronde blok 4: het aantal staat voortaan alleen nog in de
          gedeelde samenvattingsregel erboven (PostCard) — hier een label
          i.p.v. een dubbel-getoond getal. */}
      {size === "md" && "Vind ik leuk"}
    </button>
  );
}
