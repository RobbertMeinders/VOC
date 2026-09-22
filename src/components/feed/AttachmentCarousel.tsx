"use client";

import { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { ImageLightbox } from "./ImageLightbox";
import type { FeedAttachment } from "@/lib/feed/types";

function Cell({
  image,
  remainingCount,
  remainingClassName,
  onClick,
  className,
}: {
  image: FeedAttachment;
  remainingCount?: number;
  remainingClassName?: string;
  onClick: () => void;
  className?: string;
}) {
  if (!image.url) return null;
  return (
    <button type="button" onClick={onClick} className={clsx("overflow-hidden bg-black/[.03] dark:bg-white/[.03]", className)}>
      <Image src={image.url} alt={image.fileName} fill sizes="(min-width: 640px) 600px, 100vw" className="object-cover" />
      {Boolean(remainingCount) && (
        <span
          className={clsx(
            "absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white",
            remainingClassName
          )}
        >
          +{remainingCount}
        </span>
      )}
    </button>
  );
}

// Preview in het bericht zelf: bijgesneden (object-cover) op een vaste
// verhouding, net als Instagram/X. Bij meerdere foto's altijd maximaal 2
// naast elkaar op desktop (1 links, 1 rechts) — op mobiel is er simpelweg
// te weinig breedte voor 2 kolommen, dus daar altijd 1 foto met een groter
// "+N"-label. Beide cellen staan in de DOM (nodig om zonder JS/hydratatie-
// mismatch op viewportbreedte te reageren); de tweede cel is op mobiel
// alleen CSS-verborgen, dus next/image's lazy loading haalt 'm daar niet op.
// Klikken opent de volledige foto in een lightbox (ImageLightbox), swipebaar
// (of met pijltoetsen) tussen alle foto's van dit bericht, niet alleen de
// zichtbare preview-cellen.
export function AttachmentCarousel({ images }: { images: FeedAttachment[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const visible = images.slice(0, 2);
  const mobileRemaining = images.length - 1;
  const desktopRemaining = images.length - visible.length;

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-xl">
        {visible.length === 1 ? (
          <div className="relative h-80 w-full">
            <Cell image={visible[0]} onClick={() => setLightboxIndex(0)} className="absolute inset-0" />
          </div>
        ) : (
          <div className="grid h-80 grid-cols-1 gap-0.5 sm:grid-cols-2">
            <Cell
              image={visible[0]}
              remainingCount={mobileRemaining}
              remainingClassName="sm:hidden"
              onClick={() => setLightboxIndex(0)}
              className="relative h-full w-full"
            />
            <Cell
              image={visible[1]}
              remainingCount={desktopRemaining}
              remainingClassName="hidden sm:flex"
              onClick={() => setLightboxIndex(1)}
              className="relative hidden h-full w-full sm:block"
            />
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}
