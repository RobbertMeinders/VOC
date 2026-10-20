import Image from "next/image";
import { clsx } from "clsx";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = 40,
  className,
  // Stijlronde (Bestuur): foto's daar niet rond maar afgeronde vierkanten,
  // in hogere kwaliteit — standaardgedrag (rond, standaardkwaliteit) blijft
  // voor elke andere aanroeper ongewijzigd.
  shape = "circle",
  quality,
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  shape?: "circle" | "square";
  quality?: number;
}) {
  const roundedClass = shape === "circle" ? "rounded-full" : "rounded-xl";
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        width={size}
        height={size}
        quality={quality}
        className={clsx(roundedClass, "object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // Afwerkronde blok 3 ("mensen zijn geen icoon"): initialen waren eerst rood,
  // toen petrol-soft/petrol — maar een petrol-tint hoort bij iconen/links,
  // niet bij een persoon. Neutraal grijs (hetzelfde --raised-token als
  // overige vlakke achtergronden elders) i.p.v. een kleur die eigenlijk iets
  // anders betekent. Dit ene component wordt door de hele app gedeeld
  // (leden, berichten, reacties, navigatie, enz.), dus geldt daarmee overal
  // in één keer.
  return (
    <div
      className={clsx("flex shrink-0 items-center justify-center bg-raised font-semibold text-foreground", roundedClass, className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
