import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Box, Cpu, Hand, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore, uid } from "@/lib/store";
import { calculatePricing, type PricingInput } from "@/lib/pricing";
import { ResultPanel, type CostRow } from "./ResultPanel";
import { Field } from "./Field";

type Form = Omit<PricingInput, "hours"> & { h: number; m: number };

export function FdmCalculator() {
  const { settings, filaments, printers, ready, setOrders, setFilaments } =
    useStore();
  const navigate = useNavigate();
  const [filamentId, setFilamentId] = useState<string>("manual");
  const [printerId, setPrinterId] = useState<string>("manual");
  const [f, setF] = useState<Form | null>(null);
  const fdmPrinters = useMemo(
    () => printers.filter((p) => p.technology !== "Resina"),
    [printers],
  );

  useEffect(() => {
    if (!ready || f) return;
    const p = fdmPrinters[0];
    setPrinterId(p?.id ?? "manual");
    setFilamentId(filaments[0]?.id ?? "manual");
    setF({
      pieceWeight: 80,
      wasteWeight: 8,
      costPerKg: filaments[0]?.costPerKg ?? 110,
      powerW: p?.powerW ?? settings.powerW,
      h: 4,
      m: 30,
      energyRate: settings.energyRate,
      printerValue: p?.value ?? 3000,
      lifeHours: p?.lifeHours ?? 5000,
      annualMaintenance: p?.annualMaintenance ?? 300,
      monthlyHours: 120,
      prepMin: 15,
      postMin: 20,
      hourlyRate: settings.hourlyRate,
      feePct: settings.feePct,
      fixedFee: settings.fixedFee,
      taxPct: settings.taxPct,
      marginPct: settings.marginPct,
      customPrice: 0,
    });
  }, [ready]);

  const set =
    <K extends keyof Form>(k: K) =>
    (v: Form[K]) =>
      setF((p) => (p ? { ...p, [k]: v } : p));
  const r = useMemo(
    () => (f ? calculatePricing({ ...f, hours: f.h + f.m / 60 }) : null),
    [f],
  );

  if (!f || !r) {
    return (
      <Card className="rounded-xl shadow-soft">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  const pickFilament = (id: string) => {
    setFilamentId(id);
    const fil = filaments.find((x) => x.id === id);
    if (fil) set("costPerKg")(fil.costPerKg);
  };
  const pickPrinter = (id: string) => {
    setPrinterId(id);
    const p = printers.find((x) => x.id === id);
    if (p)
      setF(
        (s) =>
          s && {
            ...s,
            powerW: p.powerW,
            printerValue: p.value,
            lifeHours: p.lifeHours,
            annualMaintenance: p.annualMaintenance,
          },
      );
  };

  const rows: CostRow[] = [
    { label: "Filamento", value: r.filament, icon: Box },
    { label: "Energia", value: r.energy, icon: Zap },
    { label: "Máquina", value: r.machine, icon: Cpu },
    { label: "Mão de obra", value: r.labor, icon: Hand },
  ];

  const save = (client: string, piece: string) => {
    const grams = f.pieceWeight + f.wasteWeight;
    const fil = filaments.find((x) => x.id === filamentId);
    setOrders((o) => [
      {
        id: uid(),
        client,
        piece,
        date: new Date().toISOString(),
        printMinutes: f.h * 60 + f.m,
        technology: "FDM",
        ...(fil ? { filamentId: fil.id } : {}),
        grams,
        cost: r.totalCost,
        price: r.price,
        profit: r.profit,
        status: "Orçamento",
        breakdown: {
          filament: r.filament,
          energy: r.energy,
          machine: r.machine,
          labor: r.labor,
          fees: r.fees,
        },
      },
      ...o,
    ]);
    if (fil)
      setFilaments((list) =>
        list.map((x) =>
          x.id === fil.id
            ? { ...x, remaining: Math.max(0, x.remaining - grams) }
            : x,
        ),
      );
    toast.success("Pedido salvo", {
      description: fil ? `${grams} g descontados de ${fil.name}` : undefined,
    });
    navigate({ to: "/pedidos" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="rounded-xl shadow-soft">
        <CardContent className="p-5">
          <Tabs defaultValue="fil">
            <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="fil">Filamento</TabsTrigger>
              <TabsTrigger value="en">Energia</TabsTrigger>
              <TabsTrigger value="maq">Máquina</TabsTrigger>
              <TabsTrigger value="mo">Mão de obra</TabsTrigger>
              <TabsTrigger value="tx">Taxas e margem</TabsTrigger>
            </TabsList>

            <TabsContent value="fil" className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Filamento
                </Label>
                <Select value={filamentId} onValueChange={pickFilament}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Entrada manual</SelectItem>
                    {filaments.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name} · {x.remaining} g
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="Peso da peça"
                suffix="g"
                value={f.pieceWeight}
                onChange={set("pieceWeight")}
              />
              <Field
                label="Suportes / desperdício"
                suffix="g"
                value={f.wasteWeight}
                onChange={set("wasteWeight")}
              />
              <Field
                label="Custo por kg"
                suffix="R$/kg"
                value={f.costPerKg}
                onChange={set("costPerKg")}
              />
            </TabsContent>

            <TabsContent value="en" className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Potência média"
                suffix="W"
                value={f.powerW}
                onChange={set("powerW")}
              />
              <Field
                label="Tarifa de energia"
                suffix="R$/kWh"
                value={f.energyRate}
                onChange={set("energyRate")}
              />
              <Field
                label="Tempo — horas"
                suffix="h"
                step="1"
                value={f.h}
                onChange={set("h")}
              />
              <Field
                label="Tempo — minutos"
                suffix="min"
                step="1"
                value={f.m}
                onChange={set("m")}
              />
            </TabsContent>

            <TabsContent value="maq" className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Impressora FDM
                </Label>
                <Select value={printerId} onValueChange={pickPrinter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Entrada manual</SelectItem>
                    {fdmPrinters.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="Valor da impressora"
                suffix="R$"
                value={f.printerValue}
                onChange={set("printerValue")}
              />
              <Field
                label="Vida útil estimada"
                suffix="h"
                value={f.lifeHours}
                onChange={set("lifeHours")}
              />
              <Field
                label="Manutenção anual"
                suffix="R$"
                value={f.annualMaintenance}
                onChange={set("annualMaintenance")}
              />
              <Field
                label="Horas de uso no mês"
                suffix="h"
                value={f.monthlyHours}
                onChange={set("monthlyHours")}
              />
            </TabsContent>

            <TabsContent value="mo" className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Preparação"
                suffix="min"
                value={f.prepMin}
                onChange={set("prepMin")}
              />
              <Field
                label="Pós-processamento"
                suffix="min"
                value={f.postMin}
                onChange={set("postMin")}
              />
              <Field
                label="Valor da hora"
                suffix="R$/h"
                value={f.hourlyRate}
                onChange={set("hourlyRate")}
              />
            </TabsContent>

            <TabsContent value="tx" className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Taxa do e-commerce"
                suffix="%"
                value={f.feePct}
                onChange={set("feePct")}
              />
              <Field
                label="Taxa fixa por venda"
                suffix="R$"
                value={f.fixedFee}
                onChange={set("fixedFee")}
              />
              <Field
                label="Impostos"
                suffix="%"
                value={f.taxPct}
                onChange={set("taxPct")}
              />
              <Field
                label="Preço praticado (opcional)"
                suffix="R$"
                value={f.customPrice ?? 0}
                onChange={set("customPrice")}
              />
              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Margem de lucro desejada
                  </Label>
                  <span className="text-sm font-semibold tabular text-primary">
                    {f.marginPct}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={200}
                  step={1}
                  value={[f.marginPct]}
                  onValueChange={([v]) => set("marginPct")(v ?? 0)}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ResultPanel
        rows={rows}
        result={r}
        quoteInfo={[
          `Tecnologia: FDM`,
          `Tempo de impressão: ${f.h}h${String(f.m).padStart(2, "0")}`,
          `Material: ${f.pieceWeight + f.wasteWeight} g`,
        ]}
        onSave={save}
      />
    </div>
  );
}
