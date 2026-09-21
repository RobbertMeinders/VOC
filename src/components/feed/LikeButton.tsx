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
  initialCount,
  toggleAction,
  size = "md",
}: {
  targetId: string;
  initialLiked: boolean;
  initialCount: number;
  toggleAction: (id: string) => Promise<{ liked: boolean }>;
  size?: "sm" | "md";
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    startTransition(async () => {
      try {
        const result = await toggleAction(targetId);
        if (result.liked !== nextLiked) {
          setLiked(result.liked);
          setCount((c) => c + (result.liked ? 1 : -1));
        }
      } catch {
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={clsx(
        "flex items-center gap-1.5 rounded-full font-medium transition-colors",
        size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-sm",
        liked ? "text-voc-red" : "text-muted hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      )}
    >
      <ThumbsUp size={size === "sm" ? 13 : 16} className={liked ? "fill-voc-red" : ""} />
      {size === "md" && count > 0 && count}
    </button>
  );
}
