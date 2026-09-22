import { Loader2 } from "lucide-react";

// Eén simpel, generiek laadicoon voor elke @modal-overlay terwijl de
// server component data ophaalt — i.p.v. per route-type een eigen
// skeleton-vorm te proberen na te bootsen (die zelden echt overeenkwam met
// de uiteindelijke inhoud en zo meer verwarde dan hielp).
export function OverlayLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-muted">
      <Loader2 size={28} className="animate-spin" />
    </div>
  );
}
