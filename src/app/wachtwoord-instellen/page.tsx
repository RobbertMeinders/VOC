import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { requireProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Wachtwoord instellen" };

export default async function SetPasswordPage() {
  await requireProfile();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h1 className="mb-1 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Nieuw wachtwoord instellen</h1>
          <p className="mb-6 text-sm text-muted">Kies een nieuw wachtwoord voor je account.</p>
          <SetPasswordForm />
        </div>
      </div>
    </div>
  );
}
