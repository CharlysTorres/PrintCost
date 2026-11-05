import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Cpu,
  Droplets,
  FlaskConical,
  Hand,
  Layers,
  Package,
  ShieldCheck,
  SprayCan,
  Zap,
} from "lucide-react";
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
import { calculateResinPricing, type ResinPricingInput } from "@/lib/resin";
import { ResultPanel, type CostRow } from "./ResultPanel";
import { Field } from "./Field";

type Form = Omit<ResinPricingInput, "hours"> & { h: number; m: number };

export function ResinCalculator() {
  const { settings, resins, printers, ready, setOrders, setResins } =
    useStore();
  const navigate = useNavigate();
  const [resinId, setResinId] = useState<string>("manual");
  const [printerId, setPrinterId] = useState<string>("manual");
  const [f, setF] = useState<Form | null>(null);
  const resinPrinters = useMemo(
    () => printers.filter((p) => p.technology === "Resina"),
    [printers],
  );

  useEffect(() => {
    if (!ready || f) return;
    const p = resinPrinters[0];
    const stock = resins[0];
    setPrinterId(p?.id ?? "manual");
    setResinId(stock?.id ?? "manual");
    setF({
      volumeMl: 60,
      wasteMl: 15,
      costPerLiter: stock?.costPerLiter ?? settings.resinCostPerLiter,
      powerW: p?.powerW ?? settings.resinPowerW,
      h: 6,
      m: 0,
      energyRate: settings.energyRate,
      printerValue: p?.value ?? 2500,
      lifeHours: p?.lifeHours ?? 3000,
      annualMaintenance: p?.annualMaintenance ?? 200,
      monthlyHours: 120,
      fepCost: settings.fepCost,
      fepPrints: settings.fepPrints,
      ipaMl: 250,
      ipaCostPerLiter: settings.ipaCostPerLiter,
      gloves: 2,
      gloveUnitCost: settings.gloveUnitCost,
      extraConsumables: 1.5,
      prepMin: 10,
      postMin: 25,
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
    () => (f ? calculateResinPricing({ ...f, hours: f.h + f.m / 60 }) : null),
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

  const pickResin = (id: string) => {
    setResinId(id);
    const stock = resins.find((x) => x.id === id);
    if (stock) set("costPerLiter")(stock.costPerLiter);
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
    { label: "Resina", value: r.resin, icon: FlaskConical },
    { label: "Energia", value: r.energy, icon: Zap },
    { label: "Máquina", value: r.machine, icon: Cpu },
    { label: "Película FEP", value: r.fep, icon: Layers },
    { label: "Álcool isopropílico", value: r.ipa, icon: SprayCan },
    { label: "EPI (luvas)", value: r.ppe, icon: ShieldCheck },
    { label: "Consumíveis", value: r.consumables, icon: Package },
    { label: "Mão de obra", value: r.labor, icon: Hand },
  ];

  const save = (client: string, piece: string) => {
    const used = f.volumeMl + f.wasteMl;
    const stock = resins.find((x) => x.id === resinId);
    setOrders((o) => [
      {
        id: uid(),
        client,
        piece,
        date: new Date().toISOString(),
        printMinutes: f.h * 60 + f.m,
        technology: "Resina",
        grams: 0,
        volumeMl: Math.round(used),
        ...(stock ? { resinId: stock.id } : {}),
        cost: r.totalCost,
        price: r.price,
        profit: r.profit,
        status: "Orçamento",
        breakdown: {
          filament: 0,
          energy: r.energy,
          machine: r.machine,
          labor: r.labor,
          fees: r.fees,
          resin: r.resin,
          fep: r.fep,
          ipa: r.ipa,
          ppe: r.ppe,
          consumables: r.consumables,
        },
      },
      ...o,
    ]);
    if (stock) {
      setResins((list) =>
        list.map((x) =>
          x.id === stock.id
            ? { ...x, remainingMl: Math.max(0, x.remainingMl - used) }
            : x,
        ),
      );
    }
    toast.success("Pedido de resina salvo", {
      description: stock
        ? `${Math.round(used)} ml descontados de ${stock.name}`
        : undefined,
    });
    navigate({ to: "/pedidos" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="rounded-xl shadow-soft">
        <CardContent className="p-5">
          <Tabs defaultValue="res">
            <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="res">Resina</TabsTrigger>
              <TabsTrigger value="imp">Impressão</TabsTrigger>
              <TabsTrigger value="cons">Consumíveis</TabsTrigger>
              <TabsTrigger value="mo">Mão de obra</TabsTrigger>
              <TabsTrigger value="tx">Taxas e margem</TabsTrigger>
            </TabsList>

            <TabsContent value="res" className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Resina do estoque
                </Label>
                <Select value={resinId} onValueChange={pickResin}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Entrada manual</SelectItem>
                    {resins.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name} · {x.remainingMl} ml
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="Volume da peça"
                suffix="ml"
                value={f.volumeMl}
                onChange={set("volumeMl")}
                hint={
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    Pegue o volume no slicer. Resina ≈ 1,1 g/ml (1 L ≈ 1.100 g).
                  </span>
                }
              />
              <Field
                label="Perdas (suportes e drenagem)"
                suffix="ml"
                value={f.wasteMl}
                onChange={set("wasteMl")}
              />
              <Field
                label="Custo da resina"
                suffix="R$/L"
                value={f.costPerLiter}
                onChange={set("costPerLiter")}
              />
            </TabsContent>

            <TabsContent value="imp" className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Impressora de resina
                </Label>
                <Select value={printerId} onValueChange={pickPrinter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Entrada manual</SelectItem>
                    {resinPrinters.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <TabsContent value="cons" className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Película FEP — preço"
                suffix="R$"
                value={f.fepCost}
                onChange={set("fepCost")}
              />
              <Field
                label="Impressões por FEP"
                suffix="un"
                step="1"
                value={f.fepPrints}
                onChange={set("fepPrints")}
              />
              <Field
                label="Álcool isopropílico por impressão"
                suffix="ml"
                value={f.ipaMl}
                onChange={set("ipaMl")}
              />
              <Field
                label="Custo do álcool"
                suffix="R$/L"
                value={f.ipaCostPerLiter}
                onChange={set("ipaCostPerLiter")}
              />
              <Field
                label="Luvas por impressão"
                suffix="pares"
                value={f.gloves}
                onChange={set("gloves")}
              />
              <Field
                label="Custo do par de luvas"
                suffix="R$"
                value={f.gloveUnitCost}
                onChange={set("gloveUnitCost")}
              />
              <Field
                label="Outros consumíveis por impressão"
                suffix="R$"
                value={f.extraConsumables}
                onChange={set("extraConsumables")}
                hint="Papel-toalha, funil, filtro e outros itens de uso único."
              />
            </TabsContent>

            <TabsContent value="mo" className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Preparação (fatiamento e setup)"
                suffix="min"
                value={f.prepMin}
                onChange={set("prepMin")}
              />
              <Field
                label="Pós-processamento (limpeza e cura)"
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
          "Tecnologia: Resina (SLA/DLP)",
          `Tempo de impressão: ${f.h}h${String(f.m).padStart(2, "0")}`,
          `Resina: ${f.volumeMl + f.wasteMl} ml`,
        ]}
        onSave={save}
      />
    </div>
  );
}
