import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Wachtwoord vergeten" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-foreground">Wachtwoord vergeten</h1>
          <p className="mb-6 text-sm text-muted">
            Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen.
          </p>
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-voc-red hover:underline">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
