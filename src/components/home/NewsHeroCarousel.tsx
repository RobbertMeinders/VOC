"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Megaphone } from "lucide-react";

export type NewsHeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  body: string;
  imageUrl: string | null;
};

const SLIDE_DURATION_MS = 6000;

// Nieuwe hero-slideshow (op gebruikersverzoek): bij meerdere nieuwsitems
// blijft elk even in beeld en schuift daarna naar links weg voor het
// volgende, i.p.v. alleen het allerlaatste bericht te tonen. Bij één item
// gewoon statisch, zonder dots/interval — die zijn dan zinloos.
export function NewsHeroCarousel({ slides }: { slides: NewsHeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    timeoutRef.current = setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, SLIDE_DURATION_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [index, slides.length]);

  return (
    <div className="relative h-80 overflow-hidden rounded-2xl shadow-sm sm:h-[28rem]">
      {slides.map((slide, slideIndex) => {
        const offset = slideIndex - index;
        // Elke slide staat op een eigen horizontale positie t.o.v. de
        // actieve: huidige op 0%, volgende op 100% (rechts, buiten beeld),
        // vorige op -100% (links, buiten beeld) — zo schuift bij een
        // indexwissel alles in één keer soepel naar links door.
        return (
          <Link
            key={slide.id}
            href="/nieuws"
            aria-hidden={slideIndex !== index}
            tabIndex={slideIndex === index ? undefined : -1}
            className="absolute inset-0 block transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(${offset * 100}%)` }}
          >
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 768px"
                className="object-cover object-[center_30%]"
                priority={slideIndex === 0}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-voc-red">
                <Megaphone size={72} className="text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/0" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <span className="inline-block rounded-full bg-voc-red px-2.5 py-1 text-xs font-semibold text-white">
                Nieuws
              </span>
              <p className="mt-2 line-clamp-2 text-xl font-bold leading-tight text-white sm:text-3xl">{slide.title}</p>
              {slide.subtitle && (
                <p className="mt-1 line-clamp-1 text-sm font-medium text-white/90 sm:text-base">{slide.subtitle}</p>
              )}
              <p className="mt-1.5 line-clamp-2 text-sm text-white/70 sm:line-clamp-1">{slide.body}</p>
            </div>
          </Link>
        );
      })}

      {slides.length > 1 && (
        <div className="absolute right-0 top-0 flex gap-1.5 p-4 sm:p-6">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Ga naar nieuwsitem ${slideIndex + 1}`}
              onClick={() => setIndex(slideIndex)}
              className={
                slideIndex === index
                  ? "h-1.5 w-5 rounded-full bg-white transition-all duration-300"
                  : "h-1.5 w-1.5 rounded-full bg-white/40 transition-all duration-300 hover:bg-white/70"
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
