import type { Metadata } from "next";
import Link from "next/link";
import { requireBoard } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { BestuurContent } from "@/components/vereniging/BestuurContent";

export const metadata: Metadata = { title: "Bestuur" };

export default async function BeheerBestuurPage() {
  await requireBoard();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Bestuur"
        description={
          <>
            Zo ziet de bestuurspagina er voor leden uit.{" "}
            <Link href="/beheer/leden" className="font-medium text-voc-red-text hover:underline">
              Bestuursfuncties wijs je toe via Beheer → Leden
            </Link>
            .
          </>
        }
      />
      <BestuurContent />
    </div>
  );
}
