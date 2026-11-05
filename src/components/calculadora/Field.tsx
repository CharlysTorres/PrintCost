import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function Field({
  label,
  value,
  onChange,
  suffix,
  step = "any",
  hint,
  children,
}: {
  label: string;
  value?: number;
  onChange?: (v: number) => void;
  suffix?: string;
  step?: string;
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children ?? (
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            step={step}
            min={0}
            value={Number.isFinite(value) ? value : ""}
            onChange={(e) =>
              onChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))
            }
            className={suffix ? "tabular pr-14" : "tabular"}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
      )}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
