import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Eye, Users, ShieldCheck, KeyRound, Building2 } from "lucide-react";
import { BackLink } from "@/components/ui/BackLink";

export const metadata: Metadata = { title: "Privacy & veiligheid" };

const SECTIONS = [
  {
    icon: Lock,
    title: "Persoonsgegevens",
    body: "Het ledenportaal verwerkt persoonsgegevens van leden, zoals naam, contactgegevens en functie, om het lidmaatschap en de community mogelijk te maken. Deze gegevens worden niet openbaar gepubliceerd.",
  },
  {
    icon: Eye,
    title: "Zelf bepalen wat zichtbaar is",
    body: "Je bepaalt zelf welke contactgegevens (zoals je e-mailadres of telefoonnummer) zichtbaar zijn voor andere leden. Dat regel je op Instellingen, bij Privacy.",
  },
  {
    icon: Building2,
    title: "Bedrijfsinformatie versus persoonlijke gegevens",
    body: "Openbare bedrijfsinformatie op de bedrijvengids (zoals naam, branche en logo) staat los van jouw persoonlijke contactgegevens. Die laatste worden nooit automatisch meegenomen.",
  },
  {
    icon: Users,
    title: "Toegang op basis van rol",
    body: "Bepaalde gegevens en functies, zoals ledenbeheer en beheerrapportages, zijn alleen toegankelijk voor bevoegde bestuursleden en beheerders.",
  },
  {
    icon: KeyRound,
    title: "Beveiligde login",
    body: "Inloggen gebeurt via een beveiligde verbinding, met een wachtwoord of een inloglink per e-mail. Alleen wie is uitgenodigd, krijgt toegang tot het portaal.",
  },
  {
    icon: ShieldCheck,
    title: "Toegangsrechten ook achter de schermen gecontroleerd",
    body: "Wat je op het scherm wel of niet ziet, is niet de enige controle: ook achter de schermen wordt bij elke aanvraag gecontroleerd of je rol daadwerkelijk toegang mag hebben tot die gegevens of functie.",
  },
];

export default function PrivacyVeiligheidPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/instellingen" label="Terug naar Instellingen" />
      <h1 className="mb-1 text-xl font-semibold text-foreground">Privacy & veiligheid</h1>
      <p className="mb-6 text-sm text-muted">
        Hoe het ledenportaal met je gegevens en toegang omgaat, in het kort.
      </p>

      <div className="flex flex-col gap-3">
        {SECTIONS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-voc-red-light text-voc-red">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="mt-0.5 text-sm text-muted">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted">
        Geen enkel systeem is volledig zonder risico — we nemen redelijke technische en organisatorische
        maatregelen om je gegevens te beschermen. Vragen over je gegevens? Neem contact op met het bestuur, of
        pas je voorkeuren aan op{" "}
        <Link href="/instellingen" className="font-medium text-voc-red hover:underline">
          Instellingen
        </Link>
        .
      </p>
    </div>
  );
}
