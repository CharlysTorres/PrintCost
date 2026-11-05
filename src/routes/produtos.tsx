import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ExternalLink,
  ImagePlus,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { uid, useStore, type Product } from "@/lib/store";
import { fileToImageDataUrl } from "@/lib/image";
import { formatBRL } from "@/lib/pricing";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — PrintCost" },
      {
        name: "description",
        content: "Cadastre os produtos que aparecem na sua loja pública.",
      },
      { property: "og:title", content: "Produtos — PrintCost" },
      {
        property: "og:description",
        content: "Cadastre os produtos que aparecem na sua loja pública.",
      },
    ],
  }),
  component: ProductsPage,
});

const schema = z.object({
  title: z.string().trim().min(1, "Obrigatório").max(80),
  description: z.string().trim().max(600),
  price: z.coerce.number().positive("Deve ser maior que 0"),
  quantity: z.coerce.number().int("Use um número inteiro").min(0, "Inválido"),
  variationName: z.string().trim().max(40),
  variationsText: z.string().trim().max(300),
  image: z.string(),
});
type FormV = z.infer<typeof schema>;

function ProductsPage() {
  const { products, setProducts, store, ready } = useStore();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const form = useForm<FormV>({ resolver: zodResolver(schema) as never });
  const image = form.watch("image");

  const openNew = () => {
    setEditing(null);
    form.reset({
      title: "",
      description: "",
      price: 0,
      quantity: 1,
      variationName: "",
      variationsText: "",
      image: "",
    });
    setOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    form.reset({
      title: product.title,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
      variationName: product.variationName,
      variationsText: product.variations.join(", "),
      image: product.image,
    });
    setOpen(true);
  };

  const onSubmit = (v: FormV) => {
    const variations = Array.from(
      new Set(
        v.variationsText
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean),
      ),
    ).slice(0, 20);
    const values = {
      title: v.title.trim(),
      description: v.description.trim(),
      price: v.price,
      quantity: v.quantity,
      variationName: variations.length ? v.variationName.trim() : "",
      variations,
      image: v.image.trim(),
    };

    if (editing) {
      setProducts((list) =>
        list.map((p) => (p.id === editing.id ? { ...p, ...values } : p)),
      );
      toast.success("Produto atualizado");
    } else {
      setProducts((list) => [
        { id: uid(), ...values, createdAt: new Date().toISOString() },
        ...list,
      ]);
      toast.success("Produto cadastrado");
    }
    setOpen(false);
  };

  const remove = (product: Product) => {
    setProducts((list) => list.filter((p) => p.id !== product.id));
    toast.success("Produto removido");
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      form.setValue("image", await fileToImageDataUrl(file), {
        shouldValidate: true,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao ler imagem");
    } finally {
      setUploading(false);
    }
  };

  const e = form.formState.errors;

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Monte o catálogo que aparece na sua loja pública."
        action={
          <div className="flex gap-2">
            {store.slug && (
              <Button asChild variant="outline">
                <Link
                  to="/loja/$slug"
                  params={{ slug: store.slug }}
                  target="_blank"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver loja
                </Link>
              </Button>
            )}
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
          </div>
        }
      />

      {!ready ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto cadastrado"
          text="Adicione produtos com foto, preço, estoque e variações para vender pela loja pública."
          action={<Button onClick={openNew}>Cadastrar produto</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden rounded-xl shadow-soft"
            >
              <div className="relative aspect-[4/3] bg-muted">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <ImagePlus className="h-8 w-8" />
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 shadow-soft"
                      aria-label="Ações do produto"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(product)}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => remove(product)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 font-medium">{product.title}</h3>
                  <span className="shrink-0 font-semibold tabular text-primary">
                    {formatBRL(product.price)}
                  </span>
                </div>
                {product.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {product.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-0.5">
                    {product.quantity} em estoque
                  </span>
                  {product.variations.length > 0 && (
                    <span className="rounded-md bg-accent px-2 py-0.5 text-accent-foreground">
                      {product.variationName || "Variação"}:{" "}
                      {product.variations.join(", ")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!store.slug && ready && (
        <Card className="mt-6 rounded-xl border-dashed shadow-none">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <Store className="h-5 w-5 text-muted-foreground" />
            <p className="flex-1 text-sm text-muted-foreground">
              Defina o nome e o link da loja para publicar este catálogo.
            </p>
            <Button asChild variant="outline">
              <Link to="/configuracoes">Configurar loja</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar produto" : "Novo produto"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 sm:grid-cols-2"
          >
            <FF
              label="Título"
              error={e.title?.message}
              className="sm:col-span-2"
            >
              <Input
                placeholder="Ex.: Vaso geométrico"
                {...form.register("title")}
              />
            </FF>
            <FF
              label="Descrição"
              error={e.description?.message}
              className="sm:col-span-2"
            >
              <Textarea
                rows={3}
                placeholder="Material, tamanho, prazo de produção…"
                {...form.register("description")}
              />
            </FF>
            <FF label="Valor (R$)" error={e.price?.message}>
              <Input type="number" step="0.01" {...form.register("price")} />
            </FF>
            <FF label="Quantidade em estoque" error={e.quantity?.message}>
              <Input type="number" step="1" {...form.register("quantity")} />
            </FF>
            <FF
              label="Nome da variação"
              error={e.variationName?.message}
              hint="Opcional. Ex.: Cor, Tamanho, Acabamento."
            >
              <Input
                placeholder="Ex.: Cor"
                {...form.register("variationName")}
              />
            </FF>
            <FF
              label="Opções da variação"
              error={e.variationsText?.message}
              hint="Separe por vírgula. Ex.: Preto, Branco, Azul."
            >
              <Input
                placeholder="Preto, Branco, Azul"
                {...form.register("variationsText")}
              />
            </FF>

            <FF label="Imagem do produto" className="sm:col-span-2">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                  {image ? (
                    <img
                      src={image}
                      alt="Prévia"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    placeholder="Cole a URL da imagem"
                    {...form.register("image")}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild type="button" variant="outline" size="sm">
                      <label className="cursor-pointer">
                        <ImagePlus className="h-4 w-4" />
                        {uploading ? "Enviando…" : "Enviar imagem"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(ev) => {
                            void onUpload(ev.target.files?.[0]);
                            ev.target.value = "";
                          }}
                        />
                      </label>
                    </Button>
                    {image && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => form.setValue("image", "")}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </FF>

            <DialogFooter className="sm:col-span-2">
              <Button type="submit">Salvar produto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
