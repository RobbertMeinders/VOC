import { Logo } from "@/components/ui/Logo";
import { LogoutButton } from "./LogoutButton";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur md:hidden">
      <Logo />
      <LogoutButton />
    </header>
  );
}
