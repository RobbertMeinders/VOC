import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";

type BaseProps = {
  active?: boolean;
  dotColor?: string;
  children: ReactNode;
  className?: string;
};
type ButtonProps = BaseProps & { href?: undefined; onClick: () => void };
type LinkProps = BaseProps & { href: string; onClick?: undefined };

// Redesign-besluit 5: actieve filters/tabs/chips in inkt (bg-foreground
// text-background), niet in rood meer — vervangt de ~16 eigen kopieën van
// dit patroon door de app heen (community-filters, beheer/statistieken
// periodekeuze, enz.). `dotColor` is het kleurpuntje vóór het label
// (bv. per berichtsoort een labelkleur) — optioneel, niet elke chip heeft
// een stip.
export function Chip(props: ButtonProps | LinkProps) {
  const { active, dotColor, children, className } = props;
  const classes = clsx(
    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-surface text-foreground hover:bg-black/[.03] dark:hover:bg-white/[.06]",
    className
  );
  const dot = dotColor && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />;

  if (props.href) {
    return (
      <Link href={props.href} className={classes}>
        {dot}
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} className={classes}>
      {dot}
      {children}
    </button>
  );
}
