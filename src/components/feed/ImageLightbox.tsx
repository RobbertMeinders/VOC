"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEscapeKey } from "@/lib/dom/useEscapeKey";
import { useBodyScrollLock } from "@/lib/dom/useBodyScrollLock";
import type { FeedAttachment } from "@/lib/feed/types";

const SWIPE_THRESHOLD = 50;

// Volledig-scherm overlay om een foto in het echte formaat te bekijken —
// de preview in het bericht zelf is bewust bijgesneden (object-cover), dit
// is de plek waar de hele foto te zien is. Bij meerdere foto's kun je zowel
// met de pijlen als door te swipen naar de volgende/vorige.
export function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: FeedAttachment[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef(0);

  useEscapeKey(true, onClose);
  useBodyScrollLock(true);

  function goTo(next: number) {
    setIndex((next + images.length) % images.length);
  }

  useEffect(() => {
    if (images.length <= 1) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, images.length]);

  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD) goTo(index - 1);
    else if (delta < -SWIPE_THRESHOLD) goTo(index + 1);
  }

  const current = images[index];
  if (!current?.url) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex cursor-pointer flex-col bg-black/95"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between p-4">
        {images.length > 1 && (
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
            {index + 1}/{images.length}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-4">
        {/* stopPropagation: klikken op de foto zelf mag 'm niet sluiten —
            alleen het donkerder geworden gebied eromheen sluit de lightbox. */}
        <Image
          key={current.id}
          src={current.url}
          alt={current.fileName}
          width={0}
          height={0}
          sizes="100vw"
          onClick={(e) => e.stopPropagation()}
          className="animate-fade-in max-h-full max-w-full cursor-auto object-contain"
          style={{ width: "auto", height: "auto" }}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(index - 1);
              }}
              aria-label="Vorige foto"
              className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goTo(index + 1);
              }}
              aria-label="Volgende foto"
              className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
