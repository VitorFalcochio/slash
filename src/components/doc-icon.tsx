import { FileText } from "lucide-react";
import { AppleEmoji } from "@/components/apple-emoji";
import { cn } from "@/lib/utils";

export function DocIcon({ icon, size = 18, className }: { icon?: string; size?: number; className?: string }) {
  if (icon) return <AppleEmoji emoji={icon} size={size} className={className} />;
  return <FileText className={cn("shrink-0 text-muted", className)} style={{ width: size - 2, height: size - 2 }} />;
}

export function docTitle(title: string) {
  return title.trim() || "Sem título";
}
