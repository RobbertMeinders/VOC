import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { AccessRequestForm } from "@/components/auth/AccessRequestForm";
import { VocSocialLinks } from "@/components/ui/VocSocialLinks";

export const metadata: Metadata = { title: "Toegang aanvragen" };

export default function AccessRequestPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-foreground">Toegang aanvragen</h1>
          <p className="mb-6 text-sm text-muted">
            Nog geen uitnodiging? Laat je gegevens achter en het bestuur neemt contact met je op.
          </p>
          <AccessRequestForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-voc-red hover:underline">
            Terug naar inloggen
          </Link>
        </p>
        <VocSocialLinks className="mt-6 justify-center" />
      </div>
    </div>
  );
}
