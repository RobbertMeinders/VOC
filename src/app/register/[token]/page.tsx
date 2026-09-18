import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/auth/roles";

export const metadata: Metadata = { title: "Account aanmaken" };

export default async function RegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation_preview", { p_token: token });
  const invitation = data?.[0];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {!invitation?.valid ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
            <h1 className="mb-2 text-xl font-semibold text-foreground">Uitnodiging niet geldig</h1>
            <p className="text-sm text-muted">
              Deze uitnodigingslink is ongeldig, verlopen of al gebruikt. Vraag het bestuur om een
              nieuwe link.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h1 className="mb-1 text-xl font-semibold text-foreground">Welkom bij de VOC</h1>
            <p className="mb-6 text-sm text-muted">
              Je bent uitgenodigd als <span className="font-medium text-foreground">{ROLE_LABELS[invitation.role]}</span>.
              Maak je account aan om toegang te krijgen tot het ledenportaal.
            </p>
            <RegisterForm token={token} prefilledEmail={invitation.email} />
          </div>
        )}
      </div>
    </div>
  );
}
