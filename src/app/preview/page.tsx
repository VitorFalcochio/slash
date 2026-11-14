import { Suspense } from "react";
import { PreviewView } from "@/components/views/preview-view";

export default function PreviewPage() {
  return (
    <Suspense>
      <PreviewView />
    </Suspense>
  );
}
