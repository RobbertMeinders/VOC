"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { clsx } from "clsx";
import { toggleLikeAction } from "@/app/(app)/actions";

export function LikeButton({ postId, initialLiked, initialCount }: { postId: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));

    startTransition(async () => {
      try {
        const result = await toggleLikeAction(postId);
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
        "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors",
        liked ? "text-voc-red" : "text-muted hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      )}
    >
      <Heart size={16} className={liked ? "fill-voc-red" : ""} />
      {count > 0 && count}
    </button>
  );
}
