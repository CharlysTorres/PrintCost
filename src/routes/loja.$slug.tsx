import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ImageOff,
  Loader2,
  PackageX,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { formatBRL } from "@/lib/pricing";
import type { Product } from "@/lib/store";
import {
  createStoreOrder,
  fetchStorefront,
  type StorefrontRow,
} from "@/lib/storefront";

export const Route = createFileRoute("/loja/$slug")({
  head: () => ({
    meta: [
      { title: "Loja — PrintCost" },
      {
        name: "description",
        content: "Catálogo de impressões 3D com pedido direto pelo link.",
      },
      { property: "og:title", content: "Loja — PrintCost" },
      {
        property: "og:description",
        content: "Catálogo de impressões 3D com pedido direto pelo link.",
      },
    ],
  }),
  component: PublicStorePage,
});

type LoadState = "loading" | "ready" | "missing" | "error";

function PublicStorePage() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<LoadState>("loading");
  const [storefront, setStorefront] = useState<StorefrontRow | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setStorefront(null);
    void fetchStorefront(slug)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setState("missing");
          return;
        }
        setStorefront(row);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const products = useMemo(
    () => (Array.isArray(storefront?.products) ? storefront.products : []),
    [storefront],
  );

  useEffect(() => {
    if (storefront?.name) {
      document.title = `${storefront.name} — Loja`;
    }
  }, [storefront]);

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando loja…
        </div>
      </div>
    );
  }

  if (state === "missing" || state === "error") {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
            <Store className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">
            {state === "missing" ? "Loja não encontrada" : "Loja indisponível"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {state === "missing"
              ? "Este link não existe ou foi desativado pelo lojista."
              : "Não foi possível carregar a loja agora. Tente novamente em instantes."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 md:px-8">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-90">
            <ShoppingBag className="h-4 w-4" />
            Loja oficial
          </div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            {storefront?.name || "Catálogo"}
          </h1>
          <p className="text-sm opacity-90">
            Escolha um produto, informe seus dados e faça seu pedido.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
            <PackageX className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="font-semibold">Nenhum produto publicado ainda</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              O lojista ainda não cadastrou produtos neste catálogo.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const soldOut = product.quantity <= 0;
              return (
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
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">
                        <ImageOff className="h-8 w-8" />
                      </div>
                    )}
                    {soldOut && (
                      <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Esgotado
                      </span>
                    )}
                  </div>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-medium">{product.title}</h2>
                      <span className="shrink-0 font-semibold tabular text-primary">
                        {formatBRL(product.price)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {product.description}
                      </p>
                    )}
                    {product.variations.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {product.variationName || "Variações"}:{" "}
                        {product.variations.join(", ")}
                      </p>
                    )}
                    <Button
                      className="mt-2 w-full"
                      disabled={soldOut}
                      onClick={() => setSelected(product)}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {soldOut ? "Esgotado" : "Fazer pedido"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Catálogo publicado com PrintCost
        </p>
      </main>

      {selected && storefront && (
        <OrderDialog
          slug={slug}
          product={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function OrderDialog({
  slug,
  product,
  open,
  onOpenChange,
}: {
  slug: string;
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [variation, setVariation] = useState(product.variations[0] ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const total = product.price * quantity;

  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setPhone("");
    setQuantity(1);
    setVariation(product.variations[0] ?? "");
    setErrors({});
    setOrderId(null);
  }, [open, product]);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Informe seu nome";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Informe um e-mail válido";
    if (phone.replace(/\D/g, "").length < 10)
      next.phone = "Informe um celular com DDD";
    if (!Number.isInteger(quantity) || quantity < 1)
      next.quantity = "Quantidade inválida";
    if (quantity > product.quantity) next.quantity = "Estoque insuficiente";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const id = await createStoreOrder({
        slug,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [
          {
            productId: product.id,
            title: product.title,
            price: product.price,
            quantity,
            ...(variation ? { variation } : {}),
            ...(product.image ? { image: product.image } : {}),
          },
        ],
        total,
      });
      setOrderId(id);
      toast.success("Pedido enviado!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível enviar o pedido",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {orderId ? "Pedido enviado" : "Fazer pedido"}
          </DialogTitle>
        </DialogHeader>

        {orderId ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="font-medium">Seu pedido foi enviado ao lojista.</p>
            <p className="text-sm text-muted-foreground">
              {product.title} · {formatBRL(total)}
            </p>
            <p className="text-xs text-muted-foreground">
              O lojista entrará em contato pelo e-mail ou celular informado.
            </p>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-lg border p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <ImageOff className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{product.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatBRL(product.price)} cada
                </p>
                <p className="text-xs text-muted-foreground">
                  {product.quantity} disponíveis
                </p>
              </div>
            </div>

            {product.variations.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {product.variationName || "Variação"}
                </Label>
                <Select value={variation} onValueChange={setVariation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma opção" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.variations.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Quantidade
              </Label>
              <Input
                type="number"
                min={1}
                max={Math.max(1, product.quantity)}
                value={quantity}
                onChange={(ev) => setQuantity(Number(ev.target.value))}
              />
              {errors.quantity && (
                <p className="text-xs text-destructive">{errors.quantity}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Seu nome
                </Label>
                <Input
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  placeholder="Nome completo"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">E-mail</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  placeholder="voce@email.com"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Celular</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(ev) => setPhone(ev.target.value)}
                  placeholder="(11) 99999-9999"
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular">
                {formatBRL(total)}
              </span>
            </div>

            <Button
              className="w-full"
              onClick={() => void submit()}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              Enviar pedido
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Ao enviar, o lojista recebe seu nome, e-mail e celular para
              combinar o pagamento e a entrega.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
