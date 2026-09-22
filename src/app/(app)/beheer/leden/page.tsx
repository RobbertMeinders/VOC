import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { BeheerLedenContent } from "@/components/beheer/BeheerLedenContent";

export const metadata: Metadata = { title: "Leden beheren" };

export default function BeheerLedenPage() {
  return (
    <div>
      <Breadcrumbs items={[{ label: "Beheer", href: "/beheer" }, { label: "Leden" }]} />
      <BeheerLedenContent />
    </div>
  );
}
