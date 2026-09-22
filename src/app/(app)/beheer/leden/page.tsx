import type { Metadata } from "next";
import { BackLink } from "@/components/ui/BackLink";
import { BeheerLedenContent } from "@/components/beheer/BeheerLedenContent";

export const metadata: Metadata = { title: "Leden beheren" };

export default function BeheerLedenPage() {
  return (
    <div>
      <BackLink href="/beheer" label="Terug naar Beheer" />
      <BeheerLedenContent />
    </div>
  );
}
