"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clearAllLocks } from "@/lib/dom/useBodyScrollLock";
import { isOverlayRoute } from "@/lib/ui/overlayRoutes";
import { useAnyOverlayOpen } from "@/lib/ui/OverlayContext";

// Rendert niets zelf — vangt het gemelde "op een nieuwe pagina kan ik niet
// meer naar beneden scrollen, een refresh helpt" op: een gewone,
// niet-overlay pagina met geen enkel menu-overlay open hoort nooit een
// scroll-lock te hebben staan. Als die er tóch nog is bij het landen op
// zo'n pagina (bv. een client-side navigatie waarbij de unmount-cleanup
// van een sluitend overlay net niet op tijd liep), is dat per definitie een
// weeskind-lock — opruimen.
export function ScrollLockGuard() {
  const pathname = usePathname();
  const anyMenuOverlayOpen = useAnyOverlayOpen();

  useEffect(() => {
    if (!isOverlayRoute(pathname) && !anyMenuOverlayOpen) {
      clearAllLocks();
    }
  }, [pathname, anyMenuOverlayOpen]);

  return null;
}
