import Link from "next/link";
import type { ReactNode } from "react";

// Geanonimiseerd-lid-audit: een geanonimiseerd lid ("Verwijderd lid") mag
// nergens meer doorklikbaar zijn naar zijn (lege) profielpagina. Eén
// gedeelde wrapper i.p.v. elke aanroepplek los `anonymized ? <div> : <Link>`
// te laten herhalen -- rendert verder exact dezelfde children/className,
// dus de bestaande opmaak (avatar + naam) blijft ongewijzigd.
export function ProfileLink({
  href,
  anonymized,
  className,
  onClick,
  children,
}: {
  href: string;
  anonymized: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (anonymized) {
    return <div className={className}>{children}</div>;
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
