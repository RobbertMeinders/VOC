"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FeedAttachment } from "@/lib/feed/types";

// Meerdere foto's bij een bericht/reactie tonen als carousel i.p.v. onder
// elkaar gestapeld — dat laatste werd onleesbaar zodra iemand meer dan een
// paar foto's tegelijk plaatst (tot 10 toegestaan bij het plaatsen).
export function AttachmentCarousel({ images }: { images: FeedAttachment[] }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const current = images[Math.min(index, images.length - 1)];
  if (!current.url) return null;

  if (images.length === 1) {
    return (
      <Image
        src={current.url}
        alt={current.fileName}
        width={0}
        height={0}
        sizes="(min-width: 640px) 600px, 100vw"
        className="mt-3 max-h-[520px] w-full rounded-xl object-contain"
        style={{ width: "100%", height: "auto" }}
      />
    );
  }

  return (
    <div className="relative mt-3">
      <Image
        src={current.url}
        alt={current.fileName}
        width={0}
        height={0}
        sizes="(min-width: 640px) 600px, 100vw"
        className="max-h-[520px] w-full rounded-xl bg-black/[.02] object-contain dark:bg-white/[.03]"
        style={{ width: "100%", height: "auto" }}
      />
      <button
        type="button"
        onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
        aria-label="Vorige foto"
        className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => setIndex((i) => (i + 1) % images.length)}
        aria-label="Volgende foto"
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
      >
        <ChevronRight size={18} />
      </button>
      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
        {index + 1}/{images.length}
      </span>
      <div className="mt-2 flex justify-center gap-1.5">
        {images.map((image, i) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ga naar foto ${i + 1}`}
            className={i === index ? "h-1.5 w-4 rounded-full bg-voc-red" : "h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/25"}
          />
        ))}
      </div>
    </div>
  );
}
