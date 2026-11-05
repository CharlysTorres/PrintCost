import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function FF({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
