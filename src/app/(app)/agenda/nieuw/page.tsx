import type { Metadata } from "next";
import { requireProfile } from "@/lib/auth/session";
import { isBoard } from "@/lib/auth/roles";
import { BackLink } from "@/components/ui/BackLink";
import { NewActivityFlow } from "@/components/agenda/NewActivityFlow";

export const metadata: Metadata = { title: "Nieuwe activiteit" };

export default async function NewActivityPage() {
  const profile = await requireProfile();

  return (
    <div>
      <BackLink href="/agenda" label="Terug naar agenda" />
      <NewActivityFlow board={isBoard(profile.role)} />
    </div>
  );
}
