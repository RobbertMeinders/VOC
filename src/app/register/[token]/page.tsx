import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings/app-settings";
import { ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Account aanmaken" };

export default async function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const [{ data, error }, appSettings] = await Promise.all([
    supabase.rpc("get_invitation_preview", { p_token: token }),
    getAppSettings(),
  ]);
  const invitation = data?.[0];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        {/* A (UX-audit): logo/titel-consistentie — zelfde logoUrl/site_name
            als de rest van de app i.p.v. hier terug te vallen op het harde
            VOC-merk + "Ledenportaal", ook al is dit de eerste pagina die een
            nieuw lid van het portaal ziet. */}
        <div className="mb-8 flex justify-center">
          <Logo logoUrl={appSettings.logo_url} siteName={appSettings.site_name} />
        </div>

        {error ? (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
            <h1 className="mb-2 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Kan uitnodiging niet controleren</h1>
            <p className="text-sm text-muted">
              Er ging iets mis. Probeer het later opnieuw.
            </p>
          </div>
        ) : !invitation?.valid ? (
          <div className="rounded-2xl bg-surface p-6 text-center shadow-sm">
            <h1 className="mb-2 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">Uitnodiging niet geldig</h1>
            <p className="text-sm text-muted">
              Deze uitnodigingslink is ongeldig, verlopen of al gebruikt. Vraag het bestuur om een
              nieuwe link.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface p-6 shadow-sm">
            {/* A (UX-audit): introtekst gaat nu over het lidmaatschap zelf
                i.p.v. alleen over "het portaal activeren" — zelfde toon als
                de herschreven welkomstmail (0123_membership_invitation_
                email.sql). De rol wordt alleen nog genoemd als die ertoe
                doet (bestuur/beheerder); een gewoon lid krijgt gewoon de
                korte versie. */}
            <h1 className="mb-1 font-display text-[1.75rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-[2rem]">
              Welkom bij {appSettings.org_name}
            </h1>
            <p className="mb-6 text-sm text-muted">
              {invitation.role === "lid" ? (
                "Je bent van harte welkom als lid. Maak hieronder je account aan voor het ledenportaal."
              ) : (
                <>
                  Je bent van harte welkom als{" "}
                  <span className="font-medium text-foreground">{ROLE_LABELS[invitation.role]}</span>. Maak hieronder je account
                  aan voor het ledenportaal.
                </>
              )}
            </p>
            <RegisterForm
              token={token}
              prefilledEmail={invitation.email}
              prefilled={{
                firstName: invitation.first_name,
                lastName: invitation.last_name,
                phone: invitation.phone,
                jobTitle: invitation.job_title,
                company:
                  invitation.company_id && invitation.company_name
                    ? { id: invitation.company_id, name: invitation.company_name, city: invitation.company_city }
                    : null,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
