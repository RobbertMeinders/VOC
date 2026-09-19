"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";

/**
 * Clamps text to 2 lines and only shows a "Lees meer" toggle when the text
 * actually overflows that clamp (measured once after the initial, clamped
 * render — never on a container-less pre-mount guess).
 */
export function ExpandableText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, []);

  return (
    <div className={className}>
      <p ref={ref} className={clsx("whitespace-pre-wrap text-sm text-foreground", !expanded && "line-clamp-2")}>
        {text}
      </p>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-voc-red hover:underline"
        >
          {expanded ? "Lees minder" : "Lees meer"}
        </button>
      )}
    </div>
  );
}
