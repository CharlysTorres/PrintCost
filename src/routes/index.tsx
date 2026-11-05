import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  format,
  startOfMonth,
  subMonths,
  isSameMonth,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calculator,
  Clock,
  DollarSign,
  Package,
  Percent,
  TrendingUp,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useStore } from "@/lib/store";
import { formatBRL, formatHours, formatPct } from "@/lib/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PrintCost" },
      {
        name: "description",
        content: "Faturamento, lucro e indicadores das suas impressões 3D.",
      },
      { property: "og:title", content: "Dashboard — PrintCost" },
      {
        property: "og:description",
        content: "Faturamento, lucro e indicadores das suas impressões 3D.",
      },
    ],
  }),
  component: Dashboard,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

function Dashboard() {
  const { orders, ready } = useStore();
  const delivered = useMemo(
    () => orders.filter((o) => o.status === "Entregue"),
    [orders],
  );
  const now = new Date();

  const kpi = useMemo(() => {
    const m = delivered.filter((o) => isSameMonth(parseISO(o.date), now));
    const rev = m.reduce((s, o) => s + o.price, 0);
    const profit = m.reduce((s, o) => s + o.profit, 0);
    const mins = orders
      .filter(
        (o) => isSameMonth(parseISO(o.date), now) && o.status !== "Cancelado",
      )
      .reduce((s, o) => s + o.printMinutes, 0);
    return {
      rev,
      profit,
      count: m.length,
      ticket: m.length ? rev / m.length : 0,
      mins,
      margin: rev ? (profit / rev) * 100 : 0,
    };
  }, [delivered, orders]);

  const series = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = startOfMonth(subMonths(now, 5 - i));
        const m = delivered.filter((o) => isSameMonth(parseISO(o.date), d));
        return {
          mes: format(d, "MMM", { locale: ptBR }),
          Faturamento: m.reduce((s, o) => s + o.price, 0),
          Lucro: m.reduce((s, o) => s + o.profit, 0),
        };
      }),
    [delivered],
  );

  const dist = useMemo(() => {
    const t = {
      Material: 0,
      Consumíveis: 0,
      Energia: 0,
      Máquina: 0,
      "Mão de obra": 0,
      Taxas: 0,
    };
    delivered.forEach((o) => {
      const b = o.breakdown;
      t.Material += b.filament + (b.resin ?? 0);
      t.Consumíveis +=
        (b.fep ?? 0) + (b.ipa ?? 0) + (b.ppe ?? 0) + (b.consumables ?? 0);
      t.Energia += b.energy;
      t.Máquina += b.machine;
      t["Mão de obra"] += b.labor;
      t.Taxas += b.fees;
    });
    return Object.entries(t).map(([name, value]) => ({ name, value }));
  }, [delivered]);

  const latest = [...orders]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const cards = [
    {
      label: "Faturamento do mês",
      value: formatBRL(kpi.rev),
      icon: DollarSign,
    },
    {
      label: "Lucro líquido do mês",
      value: formatBRL(kpi.profit),
      icon: TrendingUp,
      tone: kpi.profit >= 0 ? "text-success" : "text-destructive",
    },
    { label: "Pedidos entregues", value: String(kpi.count), icon: Package },
    { label: "Ticket médio", value: formatBRL(kpi.ticket), icon: ReceiptIcon },
    { label: "Horas de impressão", value: formatHours(kpi.mins), icon: Clock },
    { label: "Margem média", value: formatPct(kpi.margin), icon: Percent },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Visão geral de ${format(now, "MMMM 'de' yyyy", { locale: ptBR })}`}
        action={
          <Button asChild size="lg" className="bg-gradient-primary shadow-soft">
            <Link to="/calculadora">
              <Calculator className="h-4 w-4" />
              Nova Precificação
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card
            key={c.label}
            className="rounded-xl shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">{c.label}</span>
                <c.icon className="h-4 w-4" />
              </div>
              {ready ? (
                <div
                  className={`mt-3 text-xl font-semibold tabular ${c.tone ?? ""}`}
                >
                  {c.value}
                </div>
              ) : (
                <Skeleton className="mt-3 h-7 w-24" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="rounded-xl shadow-soft lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              Faturamento e lucro — últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {ready ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: 0, right: 8 }}>
                  <defs>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--chart-2)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-2)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="mes"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    formatter={(v: number) => formatBRL(v)}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Faturamento"
                    stroke="var(--chart-2)"
                    fill="url(#gR)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Lucro"
                    stroke="var(--chart-1)"
                    fill="url(#gP)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Distribuição de custos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {ready ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dist}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {dist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatBRL(v)}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {dist.map((d, i) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[i] }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto tabular">{formatBRL(d.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-xl shadow-soft">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Últimos pedidos</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/pedidos">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent className="divide-y">
          {!ready &&
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="my-3 h-8" />
            ))}
          {latest.map((o) => (
            <div key={o.id} className="flex items-center gap-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{o.piece}</div>
                <div className="text-xs text-muted-foreground">
                  {o.client} · {format(parseISO(o.date), "dd/MM/yyyy")}
                </div>
              </div>
              <span className="hidden tabular sm:block">
                {formatBRL(o.price)}
              </span>
              <StatusBadge status={o.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
