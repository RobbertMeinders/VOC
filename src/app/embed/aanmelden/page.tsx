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
  return (
    <div className="bg-white p-4">
      <EmbedAutoHeight />
      <div className="rounded-2xl border border-[#e5e5ea] bg-white p-5 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-[#17171a]">Word lid van de VOC</h1>
        <p className="mb-5 text-sm text-[#6b6b72]">Laat je gegevens achter en het bestuur neemt contact met je op.</p>
        <AccessRequestForm />
      </div>
    </div>
  );
}
