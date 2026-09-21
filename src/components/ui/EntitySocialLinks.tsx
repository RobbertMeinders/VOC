import { LinkedInIcon, FacebookIcon, InstagramIcon } from "./SocialIcons";

// Social-mediahandles van een lid of bedrijf zelf (LinkedIn/Instagram/
// Facebook) — anders dan VocSocialLinks (de vaste VOC-accounts), zijn dit
// per-profiel ingevulde links die alleen tonen wanneer ze zijn ingevuld.
export function EntitySocialLinks({
  linkedinUrl,
  instagramUrl,
  facebookUrl,
  className,
}: {
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  className?: string;
}) {
  const links = [
    linkedinUrl && { href: linkedinUrl, label: "LinkedIn", Icon: LinkedInIcon },
    instagramUrl && { href: instagramUrl, label: "Instagram", Icon: InstagramIcon },
    facebookUrl && { href: facebookUrl, label: "Facebook", Icon: FacebookIcon },
  ].filter((link): link is { href: string; label: string; Icon: typeof LinkedInIcon } => Boolean(link));

  if (links.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted hover:border-voc-red hover:text-voc-red"
        >
          <Icon />
        </a>
      ))}
    </div>
  );
}
