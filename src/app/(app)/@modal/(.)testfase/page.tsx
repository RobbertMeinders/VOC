import { requireProfile } from "@/lib/auth/session";
import { TestfasePageContent } from "@/components/testfase/TestfasePageContent";

export default async function TestfaseModal({ searchParams }: { searchParams: Promise<{ van?: string }> }) {
  await requireProfile();
  const { van } = await searchParams;

  return <TestfasePageContent van={van} />;
}
