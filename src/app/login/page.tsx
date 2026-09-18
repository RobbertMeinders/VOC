import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-semibold text-foreground">Welkom terug</h1>
          <p className="mb-6 text-sm text-muted">Log in om verder te gaan naar je community.</p>
          <LoginForm redirectTo={next ?? "/"} />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Nieuw lid? Vraag een uitnodigingslink aan het bestuur.
        </p>
      </div>
    </div>
  );
}
