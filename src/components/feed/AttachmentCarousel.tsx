"use client";

import { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { ImageLightbox } from "./ImageLightbox";
import type { FeedAttachment } from "@/lib/feed/types";

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

// Preview in het bericht zelf: bijgesneden (object-cover) op een vaste
// verhouding, net als Instagram/X — dat laat je meteen 1-4 foto's zien
// zonder dat de kaart torenhoog wordt. Klikken opent de volledige foto in
// een lightbox (ImageLightbox), swipebaar tussen alle foto's van dit
// bericht, niet alleen de zichtbare preview-cellen.
export function AttachmentCarousel({ images }: { images: FeedAttachment[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const visible = images.slice(0, 4);
  const remaining = images.length - visible.length;

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-xl">
        {visible.length === 1 && (
          <div className="relative h-80 w-full">
            <Cell image={visible[0]} onClick={() => setLightboxIndex(0)} className="absolute inset-0" />
          </div>
        )}
        {visible.length === 2 && (
          <div className="grid h-80 grid-cols-2 gap-0.5">
            {visible.map((image, i) => (
              <Cell key={image.id} image={image} onClick={() => setLightboxIndex(i)} className="relative h-full w-full" />
            ))}
          </div>
        )}
        {visible.length === 3 && (
          <div className="grid h-80 grid-cols-2 grid-rows-2 gap-0.5">
            <Cell image={visible[0]} onClick={() => setLightboxIndex(0)} className="relative row-span-2 h-full w-full" />
            <Cell image={visible[1]} onClick={() => setLightboxIndex(1)} className="relative h-full w-full" />
            <Cell image={visible[2]} onClick={() => setLightboxIndex(2)} className="relative h-full w-full" />
          </div>
        )}
        {visible.length === 4 && (
          <div className="grid h-80 grid-cols-2 grid-rows-2 gap-0.5">
            {visible.map((image, i) => (
              <Cell
                key={image.id}
                image={image}
                remainingCount={i === visible.length - 1 ? remaining : undefined}
                onClick={() => setLightboxIndex(i)}
                className="relative h-full w-full"
              />
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}
