import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BestuurContent } from "@/components/vereniging/BestuurContent";

export const metadata: Metadata = { title: "Bestuur" };

export default async function BestuurPage() {
  await requireProfile();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Bestuur" description="Het huidige bestuur van VOC." />
      <BestuurContent />
    </div>
  );
}
