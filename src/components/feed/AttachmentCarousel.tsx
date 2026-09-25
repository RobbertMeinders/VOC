"use client";

import { useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { ImageLightbox } from "./ImageLightbox";
import type { FeedAttachment } from "@/lib/feed/types";

const SWIPE_THRESHOLD = 50;

function Cell({
  image,
  remainingCount,
  onClick,
  className,
}: {
  image: FeedAttachment;
  remainingCount?: number;
  onClick: () => void;
  className?: string;
}) {
  if (!image.url) return null;
  return (
    <button type="button" onClick={onClick} className={clsx("overflow-hidden bg-black/[.03] dark:bg-white/[.03]", className)}>
      <Image src={image.url} alt={image.fileName} fill sizes="(min-width: 640px) 600px, 100vw" className="object-cover" />
      {Boolean(remainingCount) && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
          +{remainingCount}
        </span>
      )}
    </button>
  );
}

// Mobiele preview bij 2+ foto's: een echte swipebare carousel i.p.v. één
// vaste foto met een "+N"-label erover — je kunt zo direct in het bericht
// door alle foto's bladeren, zonder eerst de lightbox te hoeven openen.
// Zelfde volg-de-vinger-sleepmechaniek als ImageLightbox (los gehouden i.p.v.
// gedeeld, want de context — klikken opent hier de lightbox i.p.v. sluiten —
// verschilt net genoeg om hergebruik niet te vereenvoudigen).
function MobileSwipeCarousel({ images, onOpen }: { images: FeedAttachment[]; onOpen: (index: number) => void }) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
  const draggedRef = useRef(false);

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(images.length - 1, next)));
  }

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
    if (Math.abs(deltaX) > Math.abs(deltaY)) setDragX(deltaX);
  }

  function handleTouchEnd() {
    setDragging(false);
    if (dragX > SWIPE_THRESHOLD) goTo(index - 1);
    else if (dragX < -SWIPE_THRESHOLD) goTo(index + 1);
    setDragX(0);
  }

  function handleClick() {
    // Na een veeg volgt nog een synthetische click — die mag niet ook de
    // lightbox openen op een plek waar je niet naartoe wilde swipen.
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onOpen(index);
  }

  const current = images[index];
  if (!current?.url) return null;

  return (
    <div
      className="relative h-80 w-full touch-none overflow-hidden bg-black/[.03] dark:bg-white/[.03]"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <Image src={current.url} alt={current.fileName} fill sizes="100vw" className="object-cover" />
      </div>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
        {images.map((image, i) => (
          <span
            key={image.id}
            className={clsx(
              "h-1.5 rounded-full transition-all duration-150",
              i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// Preview in het bericht zelf: bijgesneden (object-cover) op een vaste
// verhouding, net als Instagram/X. Bij één foto gewoon die foto, bij 2+ op
// desktop maximaal 2 naast elkaar (1 links, 1 rechts, met "+N" op de
// tweede als er meer zijn) — op mobiel is er te weinig breedte voor 2
// kolommen, dus daar de swipebare MobileSwipeCarousel hierboven. Beide
// varianten staan in de DOM (nodig om zonder JS/hydratatie-mismatch op
// viewportbreedte te reageren) en worden puur via CSS getoond/verborgen;
// next/image's lazy loading haalt de verborgen variant daardoor niet op.
// Klikken (of bij één foto: op de foto) opent de volledige foto in een
// lightbox (ImageLightbox), swipebaar (of met pijltoetsen) tussen alle
// foto's van dit bericht, niet alleen de zichtbare preview-cellen.
export function AttachmentCarousel({ images }: { images: FeedAttachment[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-xl">
        {images.length === 1 ? (
          <div className="relative h-80 w-full">
            <Cell image={images[0]} onClick={() => setLightboxIndex(0)} className="absolute inset-0" />
          </div>
        ) : (
          <>
            <div className="sm:hidden">
              <MobileSwipeCarousel images={images} onOpen={setLightboxIndex} />
            </div>
            <div className="hidden h-80 grid-cols-2 gap-0.5 sm:grid">
              <Cell image={images[0]} onClick={() => setLightboxIndex(0)} className="relative h-full w-full" />
              <Cell
                image={images[1]}
                remainingCount={images.length - 2}
                onClick={() => setLightboxIndex(1)}
                className="relative h-full w-full"
              />
            </div>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}
