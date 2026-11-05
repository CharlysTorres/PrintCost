import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/store";

const STYLES: Record<OrderStatus, string> = {
  Orçamento: "bg-muted text-muted-foreground",
  "Em produção": "bg-warning/15 text-warning",
  Concluído: "bg-chart-2/15 text-chart-2",
  Entregue: "bg-success/15 text-success",
  Cancelado: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
