import { useState } from "react";
import {
  AlertTriangle,
  Clipboard,
  Percent,
  Save,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatPct } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export interface CostRow {
  label: string;
  value: number;
  icon: LucideIcon;
}

export interface ResultSummary {
  totalCost: number;
  minPrice: number;
  suggestedPrice: number;
  price: number;
  fees: number;
  profit: number;
  realMarginPct: number;
  isLoss: boolean;
}

export function ResultPanel({
  rows,
  result,
  quoteInfo,
  onSave,
}: {
  rows: CostRow[];
  result: ResultSummary;
  /** Linhas extras do orçamento (tempo, material, etc.). */
  quoteInfo: string[];
  onSave: (client: string, piece: string) => void;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [client, setClient] = useState("");
  const [piece, setPiece] = useState("");

  const quote = () =>
    [
      "*Orçamento PrintCost*",
      piece && `Peça: ${piece}`,
      client && `Cliente: ${client}`,
      ...quoteInfo,
      "",
      `Valor: ${formatBRL(result.price)}`,
    ]
      .filter((x) => x !== "")
      .join("\n");

  const exportQuote = async () => {
    try {
      await navigator.clipboard.writeText(quote());
      toast.success("Orçamento copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const save = () => {
    if (!client.trim() || !piece.trim()) {
      toast.error("Informe cliente e peça");
      return;
    }
    onSave(client.trim(), piece.trim());
    setSaveOpen(false);
  };

  return (
    <div className="lg:sticky lg:top-20 lg:self-start">
      <Card className="rounded-xl shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Resultado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2.5 text-sm">
            {rows.map((x) => (
              <li key={x.label} className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground">
                  <x.icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-muted-foreground">{x.label}</span>
                <span className="ml-auto tabular">{formatBRL(x.value)}</span>
              </li>
            ))}
            <li className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-muted text-muted-foreground">
                <Percent className="h-3.5 w-3.5" />
              </span>
              <span className="text-muted-foreground">Taxas e impostos</span>
              <span className="ml-auto tabular">{formatBRL(result.fees)}</span>
            </li>
          </ul>
          <div className="space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custo de produção</span>
              <span className="font-medium tabular">
                {formatBRL(result.totalCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço mínimo</span>
              <span className="font-medium tabular">
                {formatBRL(result.minPrice)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço sugerido</span>
              <span className="font-medium tabular">
                {formatBRL(result.suggestedPrice)}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-accent p-4">
            <div className="text-xs text-accent-foreground/80">
              Preço de venda
            </div>
            <div className="font-display text-3xl font-semibold tabular text-accent-foreground">
              {formatBRL(result.price)}
            </div>
            <div
              className={cn(
                "mt-1 text-sm font-medium tabular",
                result.profit >= 0 ? "text-success" : "text-destructive",
              )}
            >
              Lucro {formatBRL(result.profit)} ·{" "}
              {formatPct(result.realMarginPct)}
            </div>
          </div>
          {result.isLoss && (
            <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Preço abaixo do mínimo — esta venda dá prejuízo.
            </div>
          )}
          <div className="grid gap-2">
            <Button
              className="bg-gradient-primary"
              onClick={() => setSaveOpen(true)}
            >
              <Save className="h-4 w-4" />
              Salvar como Pedido
            </Button>
            <Button variant="outline" onClick={exportQuote}>
              <Clipboard className="h-4 w-4" />
              Exportar orçamento
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar pedido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Peça</Label>
              <Input
                value={piece}
                onChange={(e) => setPiece(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={save}>Salvar {formatBRL(result.price)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
