import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, ExternalLink, LogOut, Store, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/AppShell";
import { FF } from "@/components/FormField";
import {
  isValidSlug,
  slugify,
  useStore,
  type StoreSettings,
} from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { isSlugTaken, pushStorefront } from "@/lib/storefront";
import { initialsOf, userAvatar, userName } from "@/lib/profile";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — PrintCost" },
      {
        name: "description",
        content:
          "Valores padrão de energia, mão de obra, resina, taxas e margem.",
      },
      { property: "og:title", content: "Configurações — PrintCost" },
      {
        property: "og:description",
        content:
          "Valores padrão de energia, mão de obra, resina, taxas e margem.",
      },
    ],
  }),
  component: SettingsPage,
});

const num = z.coerce.number().min(0, "Inválido");
const schema = z.object({
  energyRate: num,
  hourlyRate: num,
  feePct: num.max(99),
  fixedFee: num,
  taxPct: num.max(99),
  marginPct: num.max(200),
  powerW: num,
  resinCostPerLiter: num,
  resinPowerW: num,
  ipaCostPerLiter: num,
  fepCost: num,
  fepPrints: num,
  gloveUnitCost: num,
});
type V = z.infer<typeof schema>;

const FIELDS: { k: keyof V; label: string }[] = [
  { k: "energyRate", label: "Tarifa de energia (R$/kWh)" },
  { k: "hourlyRate", label: "Valor da hora de trabalho (R$)" },
  { k: "feePct", label: "Taxa do e-commerce (%)" },
  { k: "fixedFee", label: "Taxa fixa por venda (R$)" },
  { k: "taxPct", label: "Impostos (%)" },
  { k: "marginPct", label: "Margem de lucro (%)" },
  { k: "powerW", label: "Potência padrão da impressora FDM (W)" },
  { k: "resinCostPerLiter", label: "Resina — custo por litro (R$/L)" },
  { k: "resinPowerW", label: "Resina — potência da impressora (W)" },
  { k: "ipaCostPerLiter", label: "Resina — álcool isopropílico (R$/L)" },
  { k: "fepCost", label: "Resina — película FEP (R$)" },
  { k: "fepPrints", label: "Resina — impressões por película FEP" },
  { k: "gloveUnitCost", label: "Resina — par de luvas (R$)" },
];

function AccountCard() {
  const { configured, user, signOut } = useAuth();
  const name = userName(user, "Conta Google");
  const avatarUrl = userAvatar(user);
  const initials = initialsOf(name);

  return (
    <Card className="mt-6 rounded-xl shadow-soft">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
        <Avatar className="h-11 w-11">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{initials || "EU"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">
            {user ? name : "Conta Google"}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {user
              ? user.email
              : configured
                ? "Entre para identificar sua conta."
                : "Login ainda não configurado neste ambiente."}
          </div>
          {user && (
            <div className="mt-0.5 text-xs text-success">
              Filamentos, resinas, impressoras e pedidos sincronizados na nuvem
              em tempo real.
            </div>
          )}
        </div>
        {user ? (
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/perfil">
                <UserRound className="h-4 w-4" />
                Perfil
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void signOut().catch(() =>
                  toast.error("Não foi possível sair"),
                );
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        ) : (
          <Button asChild variant={configured ? "default" : "outline"}>
            <Link to="/login">
              {configured ? "Entrar com Google" : "Como configurar"}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function StoreCard() {
  const { store, setStore, ready, products } = useStore();
  const { configured, user } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setName(store.name);
    setSlug(store.slug);
  }, [ready, store.name, store.slug]);

  const publicUrl =
    slug && typeof window !== "undefined"
      ? `${window.location.origin}/loja/${slug}`
      : "";

  const save = async () => {
    const cleanName = name.trim();
    const cleanSlug = slugify(slug);
    if (!cleanName) {
      toast.error("Dê um nome para a loja");
      return;
    }
    if (!isValidSlug(cleanSlug)) {
      toast.error("Use de 3 a 40 letras, números ou hífens no link");
      return;
    }

    if (configured && user) {
      setSaving(true);
      try {
        if (await isSlugTaken(cleanSlug, user.id)) {
          toast.error("Este link já está em uso por outra loja");
          return;
        }
        await pushStorefront(user.id, {
          name: cleanName,
          slug: cleanSlug,
          products,
        });
      } catch {
        toast.error(
          "Não foi possível publicar a loja. Confira o Supabase e aplique o supabase/schema.sql.",
        );
        return;
      } finally {
        setSaving(false);
      }
    }

    const next: StoreSettings = { name: cleanName, slug: cleanSlug };
    setStore(next);
    setSlug(cleanSlug);
    toast.success("Loja pública atualizada");
  };

  return (
    <Card className="mt-6 rounded-xl shadow-soft">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Loja pública</h2>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          Escolha o nome da loja e o link que os clientes vão acessar para ver
          seus produtos e fazer pedidos.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <FF label="Nome da loja">
            <Input
              value={name}
              maxLength={60}
              placeholder="Ex.: Ateliê 3D"
              onChange={(ev) => setName(ev.target.value)}
            />
          </FF>
          <FF label="Link da loja">
            <div className="flex items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
              <span className="pl-3 text-sm text-muted-foreground">/loja/</span>
              <Input
                value={slug}
                maxLength={40}
                placeholder="atelie-3d"
                className="border-0 shadow-none focus-visible:ring-0"
                onChange={(ev) => setSlug(slugify(ev.target.value))}
              />
            </div>
          </FF>
        </div>

        {publicUrl && (
          <div className="mt-4 rounded-lg border bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Link público</div>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium text-primary hover:underline"
              >
                {publicUrl}
              </a>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(publicUrl)
                      .then(() => toast.success("Link copiado"))
                      .catch(() => toast.error("Não foi possível copiar"));
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={publicUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}

        {!configured && (
          <p className="mt-4 text-xs text-warning">
            O link público exige o Supabase configurado e o schema.sql aplicado.
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            Salvar loja
          </Button>
          <Link
            to="/produtos"
            className="text-sm text-muted-foreground hover:underline"
          >
            Gerenciar produtos
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsPage() {
  const { settings, setSettings, ready } = useStore();
  const form = useForm<V>({
    resolver: zodResolver(schema) as never,
    defaultValues: settings,
  });
  useEffect(() => {
    if (ready) form.reset(settings);
  }, [ready]);
  const e = form.formState.errors;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Configurações"
        description="Valores usados por padrão em novas precificações."
      />
      <Card className="rounded-xl shadow-soft">
        <CardContent className="p-6">
          <form
            onSubmit={form.handleSubmit((v) => {
              setSettings(v);
              toast.success("Configurações salvas");
            })}
            className="grid gap-5 sm:grid-cols-2"
          >
            {FIELDS.map((f) => (
              <FF key={f.k} label={f.label} error={e[f.k]?.message}>
                <Input
                  type="number"
                  step="any"
                  className="tabular"
                  {...form.register(f.k)}
                />
              </FF>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit">Salvar configurações</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <StoreCard />
      <AccountCard />
    </div>
  );
}
