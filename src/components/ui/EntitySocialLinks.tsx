import { LinkedInIcon, FacebookIcon, InstagramIcon } from "./SocialIcons";

// Social-mediahandles van een lid of bedrijf zelf (LinkedIn/Instagram/
// Facebook) — anders dan VocSocialLinks (de vaste VOC-accounts), zijn dit
// per-profiel ingevulde links die alleen tonen wanneer ze zijn ingevuld.
// Als volwaardige rijen (icoon + naam) i.p.v. losse ronde icoontjes, zodat
// een LinkedIn-profiel bij de rest van de contactgegevens hoort i.p.v. er
// los van te staan. `variant="row"` matcht de gepolsterde contactrijen op
// het ledenprofiel (mail/telefoon); `variant="compact"` de sobere,
// tekstuele contactrijen op de bedrijfspagina.
export function EntitySocialLinks({
  linkedinUrl,
  instagramUrl,
  facebookUrl,
  variant = "row",
  className,
}: {
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  variant?: "row" | "compact";
  className?: string;
}) {
  const links = [
    linkedinUrl && { href: linkedinUrl, label: "LinkedIn", Icon: LinkedInIcon },
    instagramUrl && { href: instagramUrl, label: "Instagram", Icon: InstagramIcon },
    facebookUrl && { href: facebookUrl, label: "Facebook", Icon: FacebookIcon },
  ].filter((link): link is { href: string; label: string; Icon: typeof LinkedInIcon } => Boolean(link));

  if (links.length === 0) return null;

  const linkClassName =
    variant === "row"
      ? "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-black/[.04] dark:hover:bg-white/[.06]"
      : "flex items-center gap-1 text-sm hover:text-voc-red";

  return (
    <div className={`flex flex-col ${variant === "compact" ? "gap-1.5" : "gap-1"} ${className ?? ""}`}>
      {links.map(({ href, label, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          <span className={`shrink-0 ${variant === "row" ? "text-muted" : ""}`}>
            <Icon size={variant === "row" ? 16 : 14} />
          </span>
          {label}
        </a>
      ))}
    </div>
  );
}
