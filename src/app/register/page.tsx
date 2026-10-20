import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { BootstrapForm } from "@/components/auth/BootstrapForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Eerste account aanmaken" };

export default async function BootstrapRegisterPage() {
  const supabase = await createClient();
  const { data: alreadyInitialized } = await supabase.rpc("has_any_profiles");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {alreadyInitialized ? (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
            <h1 className="mb-2 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Al geïnitialiseerd</h1>
            <p className="text-sm text-muted">
              Er is al een account aangemaakt op dit ledenportaal. Nieuwe leden hebben een
              uitnodigingslink van het bestuur nodig.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-voc-red-text hover:underline">
              Naar het inlogscherm
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface p-6 shadow-sm">
            <h1 className="mb-1 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Eerste account aanmaken</h1>
            <p className="mb-6 text-sm text-muted">
              Er bestaat nog geen account op dit ledenportaal. Maak het eerste account aan - dit
              wordt automatisch de beheerder. Deze pagina werkt alleen tot het eerste account
              bestaat.
            </p>
            <BootstrapForm />
          </div>
        )}
      </div>
    </div>
  );
}
