import type { Metadata } from "next";
import { BeheerLedenContent } from "@/components/beheer/BeheerLedenContent";

export const metadata: Metadata = { title: "Leden beheren" };

export default function BeheerLedenPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return <BeheerLedenContent searchParams={searchParams} />;
}
