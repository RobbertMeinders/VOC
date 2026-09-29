import type { Metadata } from "next";
import { AccessRequestForm } from "@/components/auth/AccessRequestForm";
import { EmbedAutoHeight } from "@/components/embed/EmbedAutoHeight";

export const metadata: Metadata = { title: "Aanmelden bij de VOC" };

// Publieke, nav-loze pagina bedoeld voor een Elementor/WordPress-iframe op de
// publieke VOC-site — vervangt het externe WordPress-aanmeldformulier.
// Dezelfde inzending als /toegang-aanvragen (access_requests, zie
// 0022_richer_access_requests.sql): het bestuur beoordeelt en nodigt
// desgewenst uit via /beheer/aanvragen.
export default function AanmeldenEmbedPage() {
  // data-theme="light" + min-h-screen: dwingt het lichte thema af over de
  // HELE zichtbare iframe-hoogte (niet alleen de eigen inhoud) — anders
  // blijft <body> daaronder zichtbaar en kleurt die donker in bij een
  // donker OS-thema, wat als een zwarte balk onderin oogt. AccessRequestForm
  // zelf gebruikt gewoon de normale thema-tokens (bg-surface,
  // text-foreground, ...) en hoeft daarom niet apart aangepast te worden
  // voor gebruik hier vs. op /toegang-aanvragen (waar het OS/toggle-thema
  // wél gewoon gevolgd moet worden).
  return (
    <div data-theme="light" className="min-h-screen bg-surface">
      <div className="p-4">
        <EmbedAutoHeight />
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-foreground">Word lid van de VOC</h1>
          <p className="mb-5 text-sm text-muted">Laat je gegevens achter en het bestuur neemt contact met je op.</p>
          <AccessRequestForm />
        </div>
      </div>
    </div>
  );
}
