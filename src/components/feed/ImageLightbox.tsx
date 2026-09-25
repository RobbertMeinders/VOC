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
  // dragX = live verschuiving tijdens het vegen, volgt de vinger 1-op-1;
  // dragging schakelt de CSS-transition uit tijdens het slepen (anders loopt
  // de foto achter de vinger aan) en weer aan bij loslaten (voor de
  // terugveer/doorschuif-animatie). draggedRef onderscheidt een swipe van een
  // tik — zonder dat zou loslaten na een veeg de lightbox ook nog sluiten,
  // want de achtergrond heeft ook een klik-om-te-sluiten.
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const draggedRef = useRef(false);

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
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    draggedRef.current = false;
    setDragging(true);
  }

  function handleTouchMove(e: TouchEvent) {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) draggedRef.current = true;
    // Alleen laten volgen zodra duidelijk is dat het een horizontale veeg is
    // (niet bv. een verticale scroll-poging) — anders voelt het schokkerig.
    if (Math.abs(deltaX) > Math.abs(deltaY)) setDragX(deltaX);
  }

  function handleTouchEnd() {
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) goTo(index - 1);
    else if (dragX < -SWIPE_THRESHOLD) goTo(index + 1);
    setDragX(0);
  }

  function handleBackgroundClick() {
    // Na een veeg volgt op touchend nog een synthetische click — die mag de
    // lightbox niet ook meteen weer sluiten.
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onClose();
  }

  const current = images[index];
  if (!current?.url) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex touch-none cursor-pointer flex-col bg-black/95"
      onClick={handleBackgroundClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
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
            alleen het donkerder geworden gebied eromheen sluit de lightbox.
            transform hier (i.p.v. op de Image zelf) omdat `fill` de
            positionering van de Image al regelt — deze wrapper volgt puur de
            vinger, transition alleen aan buiten het slepen om (anders loopt
            de foto achter). */}
        <div
          className="relative h-full w-full cursor-auto"
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `translateX(${dragX}px)`,
            transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <Image
            key={current.id}
            src={current.url}
            alt={current.fileName}
            fill
            sizes="100vw"
            className="animate-fade-in object-contain"
          />
        </div>

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
