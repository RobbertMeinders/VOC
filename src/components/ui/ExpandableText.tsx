"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { MentionedText } from "@/components/feed/MentionedText";

// Tailwind's JIT-scanner needs the full class name literally in the source
// to generate it — `line-clamp-${lines}` as a template string would not be
// picked up, hence this explicit lookup instead of building the class name.
const CLAMP_CLASS: Record<number, string> = {
  2: "line-clamp-2",
  5: "line-clamp-5",
};

/**
 * Clamps text to N lines and only shows a toggle when the text actually
 * overflows that clamp (measured once after the initial, clamped render —
 * never on a container-less pre-mount guess).
 */
export function ExpandableText({
  text,
  className,
  lines = 2,
  mentions = false,
  expandLabel = "Lees meer",
  collapseLabel = "Lees minder",
}: {
  text: string;
  className?: string;
  lines?: number;
  mentions?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, []);

  return (
    <div className={className}>
      <p
        ref={ref}
        className={clsx("whitespace-pre-wrap text-sm text-foreground", !expanded && (CLAMP_CLASS[lines] ?? "line-clamp-2"))}
      >
        {mentions ? <MentionedText text={text} /> : text}
      </p>
      {overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-voc-red hover:underline"
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      )}
    </div>
  );
}
