"use client";

import { useEffect, useRef } from "react";

// Generieke "laad meer zodra de sentinel in beeld komt"-hook — gebruikt door
// de feed en de "bekijk alle"-overlays (bijgewoonde evenementen/berichten op
// het ledenprofiel) i.p.v. steeds opnieuw dezelfde IntersectionObserver-
// boilerplate te schrijven. `onLoadMore` moet zelf een lopende aanroep
// negeren (bv. via een pending-check) — deze hook roept 'm alleen aan
// wanneer `hasMore` waar is.
export function useInfiniteScroll(onLoadMore: () => void, hasMore: boolean) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  return sentinelRef;
}
