import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/auth/LoginForm";
import { VocSocialLinks } from "@/components/ui/VocSocialLinks";
import { isEmailConfigured } from "@/lib/email/send";
import { getAppSettings } from "@/lib/settings/app-settings";

export const metadata: Metadata = { title: "Inloggen" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; deleted?: string }>;
}) {
  const { next, deleted } = await searchParams;
  const emailEnabled = isEmailConfigured();
  // A (UX-audit): logo/titel-consistentie — buiten de app (dit scherm, en de
  // andere publieke auth-pagina's) viel Logo terug op het harde VOC-merk +
  // "Ledenportaal" i.p.v. de daadwerkelijk ingestelde logoUrl/site_name
  // (zoals Sidebar/MobileHeader die al wél doorgeven), ook als die in Beheer
  // -> Instellingen is aangepast.
  const appSettings = await getAppSettings();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo logoUrl={appSettings.logo_url} siteName={appSettings.site_name} />
        </div>
        {deleted === "1" && (
          <div className="mb-6 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
            Je account is verwijderd. Persoonsgegevens worden na 90 dagen automatisch gewist; geplaatste berichten
            en reacties blijven staan.
          </div>
        )}
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h1 className="mb-6 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Welkom terug</h1>
          <LoginForm redirectTo={next ?? "/"} magicLinkEnabled={emailEnabled} />
          {emailEnabled ? (
            <Link
              href="/wachtwoord-vergeten"
              className="mt-4 block text-center text-sm font-medium text-petrol hover:underline"
            >
              Wachtwoord vergeten?
            </Link>
          ) : (
            <p className="mt-4 text-center text-sm text-muted">
              Wachtwoord vergeten? Neem contact op met het bestuur.
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Nieuw lid?{" "}
          <Link href="/toegang-aanvragen" className="font-medium text-petrol hover:underline">
            Vraag toegang aan
          </Link>
          .
        </p>
        <VocSocialLinks className="mt-6 justify-center" />
      </div>
    </div>
  );
}
