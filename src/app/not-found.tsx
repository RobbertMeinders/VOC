import { Logo } from "@/components/ui/Logo";
import { NotFoundContent } from "@/components/ui/NotFoundContent";

// Vangt elke URL die nergens in de app matcht (bv. een kapotte link naar
// /login of /register) — src/app/(app)/not-found.tsx vangt hetzelfde
// binnen de ingelogde sidebar/bottom-nav voor een niet-bestaand lid-,
// bedrijfs- of activiteit-id.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <NotFoundContent />
    </div>
  );
}
