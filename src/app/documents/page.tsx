import { Suspense } from "react";
import { DocumentsHome } from "@/components/views/documents-home";

export default function DocumentsPage() {
  return (
    <Suspense>
      <DocumentsHome />
    </Suspense>
  );
}
