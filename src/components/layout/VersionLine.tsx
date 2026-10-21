import Link from "next/link";

// Vervangt het label naast het logo (verdrong "Ledenportaal" tot "Led…") —
// nu een rustige regel vlak boven de accountrij (desktop sidebar) resp.
// onderaan het hamburgermenu (mobiel). Staat de testfase-schakelaar uit,
// dan toont deze regel alleen nog het kale versienummer (rustiger dan
// "Feedback geven" te laten staan voor iets dat niet meer aan staat).
export function VersionLine({ showTestfase, variant }: { showTestfase: boolean; variant: "sidebar" | "hamburger" }) {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const textClass = variant === "sidebar" ? "text-muted" : "text-white/50";
  const linkClass = variant === "sidebar" ? "hover:text-foreground" : "hover:text-white/80";

  if (!showTestfase) {
    return <p className={`px-3 py-1.5 text-[11px] ${textClass}`}>Versie {version}</p>;
  }

  return (
    <p className={`px-3 py-1.5 text-[11px] ${textClass}`}>
      Proefversie {version} ·{" "}
      <Link href="/testfase" className={`font-medium underline-offset-2 hover:underline ${linkClass}`}>
        Feedback geven
      </Link>
    </p>
  );
}
