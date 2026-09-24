import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { VocSocialLinks } from "@/components/ui/VocSocialLinks";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; deleted?: string }>;
}) {
  const { next, deleted } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {deleted === "1" && (
          <div className="mb-6 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
            Je account is verwijderd. Persoonsgegevens worden na 90 dagen automatisch gewist; geplaatste berichten
            en reacties blijven staan.
          </div>
        )}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-foreground">Welkom terug</h1>
          <p className="mb-6 text-sm text-muted">Log in om verder te gaan.</p>
          <LoginForm redirectTo={next ?? "/"} />
          <Link
            href="/wachtwoord-vergeten"
            className="mt-4 block text-center text-sm font-medium text-voc-red hover:underline"
          >
            Wachtwoord vergeten?
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Nieuw lid?{" "}
          <Link href="/toegang-aanvragen" className="font-medium text-voc-red hover:underline">
            Vraag toegang aan
          </Link>
          .
        </p>
        <VocSocialLinks className="mt-6 justify-center" />
      </div>
    </div>
  );
}
