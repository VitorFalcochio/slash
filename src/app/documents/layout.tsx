import { Suspense } from "react";
import { DocumentsShell } from "@/components/views/documents-shell";

export default function DocumentsLayout({ children }: LayoutProps<"/documents">) {
  return (
    <Suspense>
      <DocumentsShell>{children}</DocumentsShell>
    </Suspense>
  );
}
