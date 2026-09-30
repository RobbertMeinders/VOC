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

// Bovengrens op de hoogte van de fotomozaïek — zonder deze werd een (bijna)
// vierkante mozaïek op een brede desktop-postkolom torenhoog (breedte volgt
// de kolom, en aspect-square maakt de hoogte daaraan gelijk). De breedte
// blijft vol, alleen de hoogte wordt begrensd, dus dit is dezelfde "breder
// mag, hoger niet"-regel als bij SingleCell, nu ook op de container zelf.
//
// Belangrijke CSS-valkuil hierbij: `aspect-ratio` + `max-height` op een
// gewoon blok-element zonder EXPLICIETE breedte laat de browser ook de
// BREEDTE terugschalen naar de geclamde hoogte (om de ratio 1:1 te
// behouden), i.p.v. alleen de hoogte te clampen — leeg bevestigd met een
// Playwright-meting: zonder `w-full` erbij werd de mozaïek-breedte
// stiekem gelijk aan MAX_HEIGHT (420px) i.p.v. de volle kolombreedte.
// `w-full` erbij (een echte, niet-"auto" breedte) voorkomt dat.
const MAX_HEIGHT = 420;

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
  const [loaded, setLoaded] = useState(false);

  if (!image.url) return null;
  return (
    <button type="button" onClick={onClick} className={clsx("relative overflow-hidden bg-black/[.03] dark:bg-white/[.03]", className)}>
      {/* opacity-0 -> 100 i.p.v. direct scherp verschijnen: zonder dit kan een
          foto die pas laat in beeld scrollt (bv. na scrollIntoView vanuit een
          notificatie-highlight) er als een abrupte "pop"/herlaad-flits uitzien
          zodra 'm klaar is met laden — zie SingleCell hieronder voor dezelfde
          reden bij de eerste/enige foto. */}
      <Image
        src={image.url}
        alt={image.fileName}
        fill
        sizes="(min-width: 640px) 600px, 100vw"
        className={clsx("object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        onLoad={() => setLoaded(true)}
      />
      {Boolean(remainingCount) && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
          +{remainingCount}
        </span>
      )}
    </button>
  );
}

// Bij precies 1 foto mag de breedte vrij zijn (een liggende foto hoeft niet
// naar vierkant gecropt te worden), maar de hoogte nooit meer dan de breedte
// worden — een staande foto zou het bericht anders onnodig lang maken.
// Begint vierkant (veilige default zonder layout shift) en verbreedt zodra
// de echte beeldverhouding bekend is uit de geladen afbeelding. MAX_HEIGHT
// zorgt daarnaast dat een (bijna-)vierkante foto op een brede desktop-
// postkolom niet alsnog torenhoog wordt — de breedte blijft vol, alleen de
// hoogte wordt begrensd (dus weer "breder, niet hoger" i.p.v. cropping).
function SingleCell({ image, onClick }: { image: FeedAttachment; onClick: () => void }) {
  const [ratio, setRatio] = useState(1);
  const [loaded, setLoaded] = useState(false);

  if (!image.url) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      // transition op aspect-ratio: zonder dit sprong het kaartje in één
      // frame van het vierkante startformaat naar de echte beeldverhouding
      // zodra de foto klaar was met laden — vooral zichtbaar bij een foto
      // die pas laat in beeld scrolt (bv. via scrollIntoView vanuit een
      // notificatie-highlight), waar dat als een soort "herlaad"-glitch
      // oogde. Nu een zachte overgang i.p.v. een abrupte sprong.
      style={{ aspectRatio: ratio, maxHeight: MAX_HEIGHT, transition: "aspect-ratio 0.3s ease-out" }}
      className="relative w-full overflow-hidden bg-black/[.03] dark:bg-white/[.03]"
    >
      <Image
        src={image.url}
        alt={image.fileName}
        fill
        sizes="(min-width: 640px) 600px, 100vw"
        className={clsx("object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth && img.naturalHeight) {
            setRatio(Math.max(1, img.naturalWidth / img.naturalHeight));
          }
          setLoaded(true);
        }}
      />
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
        {visible.length === 1 && <SingleCell image={visible[0]} onClick={() => setLightboxIndex(0)} />}

        {/* 2 foto's: elke cel apart vierkant i.p.v. de hele rij vierkant maken
            — bij 2 naast elkaar geplaatste vierkanten is de rij vanzelf 2:1
            liggend, zonder dat daar nog een aparte max-hoogte voor nodig is
            (dat was bij de vorige aanpak, met vierkant op de hele container,
            wél nodig omdat dat elke cel juist een smalle, hoge 1:2-kolom
            maakte). */}
        {visible.length === 2 && (
          <div className="grid grid-cols-2 gap-0.5">
            {visible.map((image, i) => (
              <Cell key={image.id} image={image} onClick={() => setLightboxIndex(i)} className="aspect-square" />
            ))}
          </div>
        )}

        {visible.length >= 3 && (
          <div className="grid aspect-square w-full grid-rows-[2fr_1fr] gap-0.5" style={{ maxHeight: MAX_HEIGHT }}>
            <Cell image={visible[0]} onClick={() => setLightboxIndex(0)} />
            <div
              className={clsx("grid grid-rows-[1fr] gap-0.5", visible.length === 3 ? "grid-cols-2" : "grid-cols-3")}
            >
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
