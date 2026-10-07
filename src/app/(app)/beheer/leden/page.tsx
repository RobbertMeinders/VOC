import type { Metadata } from "next";
import { BeheerLedenContent } from "@/components/beheer/BeheerLedenContent";

export const metadata: Metadata = { title: "Leden beheren" };

export default function BeheerLedenPage() {
  return <BeheerLedenContent />;
}
