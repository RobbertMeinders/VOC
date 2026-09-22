import { LinkedInIcon, FacebookIcon, InstagramIcon } from "./SocialIcons";

const LINKS = [
  { href: "https://www.linkedin.com/company/veendam/", label: "LinkedIn", Icon: LinkedInIcon },
  { href: "https://www.facebook.com/vocveendam", label: "Facebook", Icon: FacebookIcon },
  { href: "https://www.instagram.com/vocveendam/", label: "Instagram", Icon: InstagramIcon },
];

export function VocSocialLinks({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      {LINKS.map(({ href, label, Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`VOC op ${label}`}
          title={`VOC op ${label}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted hover:border-voc-red hover:text-voc-red"
        >
          <Icon />
        </a>
      ))}
    </div>
  );
}
