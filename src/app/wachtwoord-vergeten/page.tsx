import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { isEmailConfigured } from "@/lib/email/send";
import { getAppSettings } from "@/lib/settings/app-settings";

export const metadata: Metadata = { title: "Wachtwoord vergeten" };

export default async function ForgotPasswordPage() {
  const emailEnabled = isEmailConfigured();
  const appSettings = await getAppSettings();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo logoUrl={appSettings.logo_url} siteName={appSettings.site_name} />
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-sm">
          <h1 className="mb-1 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Wachtwoord vergeten</h1>
          {emailEnabled ? (
            <>
              <p className="mb-6 text-sm text-muted">
                Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen.
              </p>
              <ForgotPasswordForm />
            </>
          ) : (
            <p className="text-sm text-muted">
              Wachtwoord opnieuw instellen via e-mail is momenteel niet beschikbaar. Neem contact op met het
              bestuur om je wachtwoord te laten resetten.
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="font-medium text-voc-red-text hover:underline">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
