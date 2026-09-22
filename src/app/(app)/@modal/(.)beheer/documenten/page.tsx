import DocumentenPage from "@/app/(app)/documenten/page";

export default function BeheerDocumentenModal() {
  return <DocumentenPage searchParams={Promise.resolve({})} />;
}
