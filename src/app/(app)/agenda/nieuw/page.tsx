import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { isBoard } from "@/lib/auth/roles";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { NewActivityFlow } from "@/components/agenda/NewActivityFlow";

export const metadata: Metadata = { title: "Nieuwe activiteit" };

export default async function NewActivityPage() {
  const profile = await requireProfile();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Agenda", href: "/agenda" }, { label: "Nieuwe activiteit" }]} />
      <NewActivityFlow board={isBoard(profile.role)} />
    </div>
  );
}
