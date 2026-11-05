import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  FlaskConical,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, PageHeader } from "@/components/AppShell";
import { FF } from "@/components/FormField";
import { uid, useStore, type Resin } from "@/lib/store";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/resinas")({
  head: () => ({
    meta: [
      { title: "Resinas — PrintCost" },
      {
        name: "description",
        content: "Controle o estoque de resinas em ml e o custo por litro.",
      },
      { property: "og:title", content: "Resinas — PrintCost" },
      {
        property: "og:description",
        content: "Controle o estoque de resinas em ml e o custo por litro.",
      },
    ],
  }),
  component: ResinsPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Obrigatório").max(60),
  brand: z.string().trim().max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  remainingMl: z.coerce.number().min(0, "Inválido"),
  totalMl: z.coerce.number().positive("Deve ser > 0"),
  costPerLiter: z.coerce.number().positive("Deve ser > 0"),
  supplier: z.string().trim().max(60),
});
type FormV = z.infer<typeof schema>;

function ResinsPage() {
  const { resins, setResins, ready } = useStore();
  const [editing, setEditing] = useState<Resin | null>(null);
  const [open, setOpen] = useState(false);
  const form = useForm<FormV>({ resolver: zodResolver(schema) as never });

  const openNew = () => {
    setEditing(null);
    form.reset({
      name: "",
      brand: "",
      color: "#6b7280",
      remainingMl: 1000,
      totalMl: 1000,
      costPerLiter: 179.9,
      supplier: "",
    });
    setOpen(true);
  };
  const openEdit = (r: Resin) => {
    setEditing(r);
    form.reset(r);
    setOpen(true);
  };
  const onSubmit = (v: FormV) => {
    if (editing) {
      setResins((l) =>
        l.map((x) => (x.id === editing.id ? { ...x, ...v } : x)),
      );
      toast.success("Resina atualizada");
    } else {
      setResins((l) => [...l, { id: uid(), ...v }]);
      toast.success("Resina cadastrada");
    }
    setOpen(false);
  };
  const remove = (r: Resin) => {
    setResins((l) => l.filter((x) => x.id !== r.id));
    toast.success(`${r.name} removida`);
  };
  const e = form.formState.errors;

  return (
    <div>
      <PageHeader
        title="Resinas"
        description="Estoque em ml e custo por litro dos seus materiais."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Nova resina
          </Button>
        }
      />
      {!ready ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : resins.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Nenhuma resina"
          text="Cadastre suas resinas para calcular o custo por volume automaticamente."
          action={<Button onClick={openNew}>Cadastrar resina</Button>}
        />
      ) : (
        <Card className="overflow-hidden rounded-xl shadow-soft">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Marca</TableHead>
                <TableHead className="w-48">Restante</TableHead>
                <TableHead>Custo/L</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Fornecedor
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {resins.map((r) => {
                const low = r.remainingMl < 200;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border"
                          style={{ background: r.color }}
                        />
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {r.brand}
                    </TableCell>
                    <TableCell>
                      <div
                        className={`mb-1 flex items-center gap-1 text-xs tabular ${low ? "text-warning font-medium" : "text-muted-foreground"}`}
                      >
                        {low && <AlertTriangle className="h-3 w-3" />}
                        {r.remainingMl} ml / {r.totalMl} ml
                      </div>
                      <Progress
                        value={Math.min(100, (r.remainingMl / r.totalMl) * 100)}
                        className={low ? "[&>div]:bg-warning" : ""}
                      />
                    </TableCell>
                    <TableCell className="tabular">
                      {formatBRL(r.costPerLiter)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {r.supplier}
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
                          <DropdownMenuItem onClick={() => openEdit(r)}>
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => remove(r)}
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
              {editing ? "Editar resina" : "Nova resina"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-2 gap-4"
          >
            <FF label="Nome" error={e.name?.message} className="col-span-2">
              <Input {...form.register("name")} />
            </FF>
            <FF label="Marca">
              <Input {...form.register("brand")} />
            </FF>
            <FF label="Cor">
              <Input
                type="color"
                className="h-9 p-1"
                {...form.register("color")}
              />
            </FF>
            <FF label="Fornecedor" className="col-span-2">
              <Input {...form.register("supplier")} />
            </FF>
            <FF label="Volume restante (ml)" error={e.remainingMl?.message}>
              <Input
                type="number"
                step="any"
                {...form.register("remainingMl")}
              />
            </FF>
            <FF label="Volume da garrafa (ml)" error={e.totalMl?.message}>
              <Input type="number" step="any" {...form.register("totalMl")} />
            </FF>
            <FF
              label="Custo por litro (R$/L)"
              error={e.costPerLiter?.message}
              className="col-span-2"
            >
              <Input
                type="number"
                step="any"
                {...form.register("costPerLiter")}
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
