import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  Box,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, PageHeader } from "@/components/AppShell";
import { FF } from "@/components/FormField";
import { MATERIALS, uid, useStore, type Filament } from "@/lib/store";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/filamentos")({
  head: () => ({
    meta: [
      { title: "Filamentos — PrintCost" },
      {
        name: "description",
        content: "Controle o estoque de filamentos e o custo por kg.",
      },
      { property: "og:title", content: "Filamentos — PrintCost" },
      {
        property: "og:description",
        content: "Controle o estoque de filamentos e o custo por kg.",
      },
    ],
  }),
  component: FilamentsPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Obrigatório").max(60),
  material: z.enum(["PLA", "PETG", "ABS", "TPU", "Resina"]),
  brand: z.string().trim().max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  remaining: z.coerce.number().min(0, "Inválido"),
  total: z.coerce.number().positive("Deve ser > 0"),
  costPerKg: z.coerce.number().positive("Deve ser > 0"),
  supplier: z.string().trim().max(60),
});
type FormV = z.infer<typeof schema>;

function FilamentsPage() {
  const { filaments, setFilaments, ready } = useStore();
  const [editing, setEditing] = useState<Filament | null>(null);
  const [open, setOpen] = useState(false);
  const form = useForm<FormV>({ resolver: zodResolver(schema) as never });

  const openNew = () => {
    setEditing(null);
    form.reset({
      name: "",
      material: "PLA",
      brand: "",
      color: "#10b981",
      remaining: 1000,
      total: 1000,
      costPerKg: 110,
      supplier: "",
    });
    setOpen(true);
  };
  const openEdit = (f: Filament) => {
    setEditing(f);
    form.reset(f);
    setOpen(true);
  };
  const onSubmit = (v: FormV) => {
    if (editing) {
      setFilaments((l) =>
        l.map((x) => (x.id === editing.id ? { ...x, ...v } : x)),
      );
      toast.success("Filamento atualizado");
    } else {
      setFilaments((l) => [...l, { id: uid(), ...v }]);
      toast.success("Filamento cadastrado");
    }
    setOpen(false);
  };
  const remove = (f: Filament) => {
    setFilaments((l) => l.filter((x) => x.id !== f.id));
    toast.success(`${f.name} removido`);
  };
  const e = form.formState.errors;

  return (
    <div>
      <PageHeader
        title="Filamentos"
        description="Estoque e custo dos seus materiais."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Novo filamento
          </Button>
        }
      />
      {!ready ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : filaments.length === 0 ? (
        <EmptyState
          icon={Box}
          title="Nenhum filamento"
          text="Cadastre seus filamentos para calcular o custo automaticamente."
          action={<Button onClick={openNew}>Cadastrar filamento</Button>}
        />
      ) : (
        <Card className="overflow-hidden rounded-xl shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="hidden md:table-cell">Marca</TableHead>
                <TableHead className="w-48">Restante</TableHead>
                <TableHead>Custo/kg</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Fornecedor
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filaments.map((f) => {
                const low = f.remaining < 200;
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border"
                          style={{ background: f.color }}
                        />
                        <span className="font-medium">{f.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                        {f.material}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {f.brand}
                    </TableCell>
                    <TableCell>
                      <div
                        className={`mb-1 flex items-center gap-1 text-xs tabular ${low ? "text-warning font-medium" : "text-muted-foreground"}`}
                      >
                        {low && <AlertTriangle className="h-3 w-3" />}
                        {f.remaining} g / {f.total} g
                      </div>
                      <Progress
                        value={Math.min(100, (f.remaining / f.total) * 100)}
                        className={low ? "[&>div]:bg-warning" : ""}
                      />
                    </TableCell>
                    <TableCell className="tabular">
                      {formatBRL(f.costPerKg)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {f.supplier}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Ações"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(f)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => remove(f)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar filamento" : "Novo filamento"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-2 gap-4"
          >
            <FF label="Nome" error={e.name?.message} className="col-span-2">
              <Input {...form.register("name")} />
            </FF>
            <FF label="Material">
              <Controller
                control={form.control}
                name="material"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIALS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FF>
            <FF label="Cor">
              <Input
                type="color"
                className="h-9 p-1"
                {...form.register("color")}
              />
            </FF>
            <FF label="Marca">
              <Input {...form.register("brand")} />
            </FF>
            <FF label="Fornecedor">
              <Input {...form.register("supplier")} />
            </FF>
            <FF label="Peso restante (g)" error={e.remaining?.message}>
              <Input type="number" step="any" {...form.register("remaining")} />
            </FF>
            <FF label="Peso do carretel (g)" error={e.total?.message}>
              <Input type="number" step="any" {...form.register("total")} />
            </FF>
            <FF label="Custo por kg (R$)" error={e.costPerKg?.message}>
              <Input type="number" step="any" {...form.register("costPerKg")} />
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
