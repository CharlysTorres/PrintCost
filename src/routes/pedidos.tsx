import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { toast } from "sonner";
import { Download, Receipt, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUSES, useStore, type OrderStatus } from "@/lib/store";
import { formatBRL, formatHours } from "@/lib/pricing";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos e Faturamento — PrintCost" },
      {
        name: "description",
        content: "Acompanhe pedidos, status e lucro de cada impressão.",
      },
      { property: "og:title", content: "Pedidos e Faturamento — PrintCost" },
      {
        property: "og:description",
        content: "Acompanhe pedidos, status e lucro de cada impressão.",
      },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { orders, setOrders, ready } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [period, setPeriod] = useState<string>("all");

  const list = useMemo(() => {
    const since = period === "all" ? null : subDays(new Date(), Number(period));
    return [...orders]
      .filter(
        (o) =>
          (status === "all" || o.status === status) &&
          o.client.toLowerCase().includes(q.toLowerCase()) &&
          (!since || parseISO(o.date) >= since),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, q, status, period]);

  const changeStatus = (id: string, s: OrderStatus) => {
    setOrders((l) => l.map((o) => (o.id === id ? { ...o, status: s } : o)));
    toast.success(
      s === "Entregue"
        ? "Pedido entregue — contabilizado no faturamento"
        : `Status alterado para ${s}`,
    );
  };

  const exportCsv = () => {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      [
        "Cliente",
        "Peça",
        "Data",
        "Tempo (min)",
        "Custo",
        "Preço",
        "Lucro",
        "Status",
      ],
      ...list.map((o) => [
        o.client,
        o.piece,
        format(parseISO(o.date), "dd/MM/yyyy"),
        o.printMinutes,
        o.cost.toFixed(2),
        o.price.toFixed(2),
        o.profit.toFixed(2),
        o.status,
      ]),
    ];
    const blob = new Blob(
      ["\ufeff" + rows.map((r) => r.map(esc).join(";")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pedidos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("CSV exportado");
  };

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description="Somente pedidos entregues entram no faturamento."
        action={
          <Button variant="outline" onClick={exportCsv} disabled={!list.length}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!ready ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhum pedido encontrado"
          text="Crie uma precificação e salve como pedido."
          action={
            <Button asChild>
              <Link to="/calculadora">Nova precificação</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden rounded-xl shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente / Peça</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead className="hidden lg:table-cell">Tempo</TableHead>
                <TableHead className="hidden sm:table-cell text-right">
                  Custo
                </TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-medium">
                      {o.client}
                      {o.technology === "Resina" && (
                        <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                          Resina
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {o.piece}
                      {o.technology === "Resina" && o.volumeMl
                        ? ` · ${o.volumeMl} ml`
                        : ""}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell tabular text-muted-foreground">
                    {format(parseISO(o.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell tabular text-muted-foreground">
                    {formatHours(o.printMinutes)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right tabular">
                    {formatBRL(o.cost)}
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {formatBRL(o.price)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular font-medium ${o.profit >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {formatBRL(o.profit)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <StatusBadge status={o.status} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => changeStatus(o.id, s)}
                          >
                            {s}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      onClick={() => {
                        setOrders((l) => l.filter((x) => x.id !== o.id));
                        toast.success("Pedido excluído");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
