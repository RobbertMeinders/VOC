"use client";

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

// Rendert children direct in document.body i.p.v. ter plekke in de DOM-boom.
// Nodig voor elke fixed-gepositioneerde popover die vanuit MobileHeader of
// BottomNav opent: beide hebben backdrop-blur, en filter/backdrop-filter op
// een voorouder maakt die voorouder het containing block voor position:fixed
// kinderen (en trekt geneste content in zijn eigen stacking context). Zonder
// portal kon zo'n popover dus "opgesloten" raken en achter andere pagina-
// content of een geopende overlay uitkomen i.p.v. er echt overheen — precies
// wat er met de zoekbalk gebeurde (zie SearchOverlay) en met de mobiele
// notificatie-/netwerk-/accountmenu's.
export function FloatingPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
