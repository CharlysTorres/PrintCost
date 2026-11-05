import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  FlaskConical,
  Pencil,
  Plus,
  Printer as PrinterIcon,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader } from "@/components/AppShell";
import { FF } from "@/components/FormField";
import { TECHNOLOGIES, uid, useStore, type Printer } from "@/lib/store";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/impressoras")({
  head: () => ({
    meta: [
      { title: "Impressoras — PrintCost" },
      {
        name: "description",
        content: "Cadastre suas impressoras 3D e acompanhe o desgaste.",
      },
      { property: "og:title", content: "Impressoras — PrintCost" },
      {
        property: "og:description",
        content: "Cadastre suas impressoras 3D e acompanhe o desgaste.",
      },
    ],
  }),
  component: PrintersPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Obrigatório").max(60),
  model: z.string().trim().max(60),
  technology: z.enum(["FDM", "Resina"]),
  powerW: z.coerce.number().positive("Deve ser > 0"),
  value: z.coerce.number().min(0),
  lifeHours: z.coerce.number().positive("Deve ser > 0"),
  hoursUsed: z.coerce.number().min(0),
  annualMaintenance: z.coerce.number().min(0),
});
type FormV = z.infer<typeof schema>;

function PrintersPage() {
  const { printers, setPrinters, ready, settings } = useStore();
  const [editing, setEditing] = useState<Printer | null>(null);
  const [open, setOpen] = useState(false);
  const form = useForm<FormV>({ resolver: zodResolver(schema) as never });
  const e = form.formState.errors;

  const openNew = () => {
    setEditing(null);
    form.reset({
      name: "",
      model: "",
      technology: "FDM",
      powerW: settings.powerW,
      value: 2000,
      lifeHours: 5000,
      hoursUsed: 0,
      annualMaintenance: 300,
    });
    setOpen(true);
  };
  const openEdit = (p: Printer) => {
    setEditing(p);
    form.reset(p);
    setOpen(true);
  };
  const onSubmit = (v: FormV) => {
    if (editing) {
      setPrinters((l) =>
        l.map((x) => (x.id === editing.id ? { ...x, ...v } : x)),
      );
      toast.success("Impressora atualizada");
    } else {
      setPrinters((l) => [...l, { id: uid(), ...v }]);
      toast.success("Impressora cadastrada");
    }
    setOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Impressoras"
        description="Seu parque de máquinas e a vida útil de cada uma."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Nova impressora
          </Button>
        }
      />
      {!ready ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : printers.length === 0 ? (
        <EmptyState
          icon={PrinterIcon}
          title="Nenhuma impressora"
          text="Cadastre uma impressora para calcular depreciação e energia."
          action={<Button onClick={openNew}>Cadastrar impressora</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {printers.map((p) => {
            const pct = Math.min(100, (p.hoursUsed / p.lifeHours) * 100);
            return (
              <Card
                key={p.id}
                className="rounded-xl shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                      {p.technology === "Resina" ? (
                        <FlaskConical className="h-5 w-5" />
                      ) : (
                        <PrinterIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{p.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.model || "—"} · {p.technology}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(p)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setPrinters((l) => l.filter((x) => x.id !== p.id));
                        toast.success(`${p.name} removida`);
                      }}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Potência
                      </dt>
                      <dd className="tabular font-medium">{p.powerW} W</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Valor</dt>
                      <dd className="tabular font-medium">
                        {formatBRL(p.value)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Vida útil
                      </dt>
                      <dd className="tabular font-medium">{p.lifeHours} h</dd>
                    </div>
                  </dl>
                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        {p.hoursUsed} h acumuladas
                      </span>
                      <span
                        className={`tabular font-medium ${pct > 75 ? "text-warning" : ""}`}
                      >
                        {pct.toFixed(0)}% consumida
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className={pct > 75 ? "[&>div]:bg-warning" : ""}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar impressora" : "Nova impressora"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-2 gap-4"
          >
            <FF label="Nome" error={e.name?.message}>
              <Input {...form.register("name")} />
            </FF>
            <FF label="Modelo">
              <Input {...form.register("model")} />
            </FF>
            <FF label="Tecnologia">
              <Controller
                control={form.control}
                name="technology"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TECHNOLOGIES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FF>
            <FF label="Potência (W)" error={e.powerW?.message}>
              <Input type="number" step="any" {...form.register("powerW")} />
            </FF>
            <FF label="Valor (R$)" error={e.value?.message}>
              <Input type="number" step="any" {...form.register("value")} />
            </FF>
            <FF label="Vida útil (h)" error={e.lifeHours?.message}>
              <Input type="number" step="any" {...form.register("lifeHours")} />
            </FF>
            <FF label="Horas acumuladas" error={e.hoursUsed?.message}>
              <Input type="number" step="any" {...form.register("hoursUsed")} />
            </FF>
            <FF label="Manutenção anual (R$)" className="col-span-2">
              <Input
                type="number"
                step="any"
                {...form.register("annualMaintenance")}
              />
            </FF>
            <DialogFooter className="col-span-2">
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
