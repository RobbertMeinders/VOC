"use client";

import { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { ImageLightbox } from "./ImageLightbox";
import type { FeedAttachment } from "@/lib/feed/types";

// Hoeveel foto's rechtstreeks zichtbaar zijn in de mozaïek voordat de
// laatste zichtbare cel een "+N"-label krijgt (1 groot bovenaan + 3 klein
// eronder) — zelfde patroon als Facebook, waar de gebruiker dit expliciet
// naar vroeg.
const MAX_VISIBLE = 4;

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
    <button type="button" onClick={onClick} className={clsx("relative overflow-hidden bg-black/[.03] dark:bg-white/[.03]", className)}>
      <Image src={image.url} alt={image.fileName} fill sizes="(min-width: 640px) 600px, 100vw" className="object-cover" />
      {Boolean(remainingCount) && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
          +{remainingCount}
        </span>
      )}
    </button>
  );
}

// Statische mozaïek-preview in het bericht zelf, net als Facebook: geen
// swipe-gebaar meer in de feed nodig (dat bleek op mobiel niet betrouwbaar
// genoeg te voelen) — tikken op een foto opent gewoon de volledige foto in
// de lightbox, waar swipen/pijltoetsen tussen alle foto's van het bericht
// al goed werkt. Vanaf 5 foto's krijgt de laatste zichtbare cel een
// "+N"-label voor de rest.
export function AttachmentCarousel({ images }: { images: FeedAttachment[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const visible = images.slice(0, MAX_VISIBLE);
  const remaining = Math.max(0, images.length - MAX_VISIBLE);

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-xl">
        {visible.length === 1 && <Cell image={visible[0]} onClick={() => setLightboxIndex(0)} className="h-80 w-full" />}

        {visible.length === 2 && (
          <div className="grid h-80 grid-cols-2 gap-0.5">
            {visible.map((image, i) => (
              <Cell key={image.id} image={image} onClick={() => setLightboxIndex(i)} />
            ))}
          </div>
        )}

        {visible.length >= 3 && (
          <div className="grid h-80 grid-rows-[3fr_2fr] gap-0.5">
            <Cell image={visible[0]} onClick={() => setLightboxIndex(0)} />
            <div className={clsx("grid gap-0.5", visible.length === 3 ? "grid-cols-2" : "grid-cols-3")}>
              {visible.slice(1).map((image, i) => (
                <Cell
                  key={image.id}
                  image={image}
                  onClick={() => setLightboxIndex(i + 1)}
                  remainingCount={i === visible.length - 2 ? remaining : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  );
}
