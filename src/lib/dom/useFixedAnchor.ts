"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

export type AnchorRect = { left: number; right: number; top: number; width: number };

/**
 * Meet de positie van een trigger-knop zodra een popover opent, zodat een
 * geportaalde (document.body) popover er toch bovenop/boven kan verschijnen
 * i.p.v. los in een hoek van het scherm — portalen (nodig tegen de backdrop-
 * filter containing-block bug, zie FloatingPortal) kost anders precies deze
 * knop-relatieve positionering.
 */
export function useFixedAnchor<T extends HTMLElement>(open: boolean): { anchorRef: RefObject<T | null>; rect: AnchorRect | null } {
  const anchorRef = useRef<T>(null);
  const [rect, setRect] = useState<AnchorRect | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setRect(null);
      return;
    }
    const box = anchorRef.current.getBoundingClientRect();
    setRect({ left: box.left, right: box.right, top: box.top, width: box.width });
  }, [open]);

  return { anchorRef, rect };
}
