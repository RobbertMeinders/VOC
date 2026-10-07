"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
const SWIPE_THRESHOLD_PX = 50;

// Nieuwe hero-slideshow (op gebruikersverzoek): bij meerdere nieuwsitems
// blijft elk even in beeld en schuift daarna naar links weg voor het
// volgende, i.p.v. alleen het allerlaatste bericht te tonen. Bij één item
// gewoon statisch, zonder dots/interval — die zijn dan zinloos. Ook
// handmatig te bedienen door te swipen (touch) of te slepen (muis) —
// Pointer Events dekken beide met dezelfde handlers.
export function NewsHeroCarousel({ slides }: { slides: NewsHeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerState = useRef<{ id: number; startX: number } | null>(null);
  const didDragRef = useRef(false);

  function resetAutoAdvance() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (slides.length <= 1) return;
    timeoutRef.current = setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, SLIDE_DURATION_MS);
  }

  useEffect(() => {
    resetAutoAdvance();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides.length]);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (slides.length <= 1) return;
    pointerState.current = { id: e.pointerId, startX: e.clientX };
    didDragRef.current = false;
    setIsDragging(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointerState.current || e.pointerId !== pointerState.current.id) return;
    const delta = e.clientX - pointerState.current.startX;
    if (Math.abs(delta) > 5) didDragRef.current = true;
    setDragOffset(delta);
  }

  function endDrag(delta: number) {
    pointerState.current = null;
    setIsDragging(false);
    setDragOffset(0);
    if (Math.abs(delta) > SWIPE_THRESHOLD_PX) {
      const direction = delta < 0 ? 1 : -1;
      setIndex((current) => (current + direction + slides.length) % slides.length);
    } else {
      resetAutoAdvance();
    }
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!pointerState.current || e.pointerId !== pointerState.current.id) return;
    endDrag(e.clientX - pointerState.current.startX);
  }

  function handlePointerCancel() {
    if (!pointerState.current) return;
    endDrag(0);
  }

  return (
    <div
      className="relative h-80 touch-pan-y select-none overflow-hidden rounded-2xl shadow-sm sm:h-[28rem]"
      style={{ cursor: slides.length > 1 ? (isDragging ? "grabbing" : "grab") : undefined }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      {slides.map((slide, slideIndex) => {
        // Kortste cirkelvormige afstand i.p.v. een kale aftrekking: bij de
        // stap van de laatste naar de eerste slide (de "wrap") gaf
        // `slideIndex - index` een sprong van bijna de volle lengte in de
        // verkeerde richting (de nieuwe eerste slide kwam van links het
        // scherm in slepen i.p.v. door te schuiven zoals elke andere
        // stap) — de carrousel leek daardoor telkens terug te springen.
        // Door steeds de kortste weg rond de cirkel te nemen, wordt die
        // wrap-stap identiek aan elke gewone stap: nieuwe slide komt altijd
        // van rechts, vorige schuift altijd naar links weg.
        let offset = slideIndex - index;
        if (offset > slides.length / 2) offset -= slides.length;
        if (offset < -slides.length / 2) offset += slides.length;
        // Elke slide staat op een eigen horizontale positie t.o.v. de
        // actieve: huidige op 0%, volgende op 100% (rechts, buiten beeld),
        // vorige op -100% (links, buiten beeld) — zo schuift bij een
        // indexwissel alles in één keer soepel naar links door. Tijdens
        // slepen komt daar de live vingerpositie (dragOffset, in px) bij,
        // zonder transition zodat die 1-op-1 meebeweegt.
        return (
          <div
            key={slide.id}
            aria-hidden={slideIndex !== index}
            className={isDragging ? "absolute inset-0" : "absolute inset-0 transition-transform duration-700 ease-in-out"}
            style={{ transform: `translateX(calc(${offset * 100}% + ${dragOffset}px))` }}
          >
            {slide.imageUrl ? (
              <Image
                src={slide.imageUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 768px"
                className="object-cover object-[center_30%]"
                priority={slideIndex === 0}
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-voc-red">
                <Megaphone size={72} className="text-white/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/0" />
            {/* Alleen de tekst is klikbaar (i.p.v. de hele slide) — zo blijft
                swipen over de afbeelding mogelijk zonder dat een sleep per
                ongeluk als klik naar /nieuws telt. */}
            <Link
              href="/nieuws"
              tabIndex={slideIndex === index ? undefined : -1}
              draggable={false}
              onClick={(e) => {
                if (didDragRef.current) {
                  e.preventDefault();
                  didDragRef.current = false;
                }
              }}
              className="absolute inset-x-0 bottom-0 block p-4 sm:p-6"
            >
              <span className="inline-block rounded-full bg-voc-red px-2.5 py-1 text-xs font-semibold text-white">
                Nieuws
              </span>
              <p className="mt-2 line-clamp-2 text-xl font-bold leading-tight text-white sm:text-3xl">{slide.title}</p>
              {slide.subtitle && (
                <p className="mt-1 line-clamp-1 text-sm font-medium text-white/90 sm:text-base">{slide.subtitle}</p>
              )}
              <p className="mt-1.5 line-clamp-2 text-sm text-white/70 sm:line-clamp-1">{slide.body}</p>
            </Link>
          </div>
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
