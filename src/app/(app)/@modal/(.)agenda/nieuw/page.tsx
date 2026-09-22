import { requireProfile } from "@/lib/auth/session";
import { isBoard } from "@/lib/auth/roles";
import { NewActivityFlow } from "@/components/agenda/NewActivityFlow";

export default async function NewActivityModal() {
  const profile = await requireProfile();

  return <NewActivityFlow board={isBoard(profile.role)} />;
}
