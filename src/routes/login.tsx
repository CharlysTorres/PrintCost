import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Box, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — PrintCost" },
      {
        name: "description",
        content: "Entre com sua conta Google para acessar o PrintCost.",
      },
      { property: "og:title", content: "Entrar — PrintCost" },
      {
        property: "og:description",
        content: "Entre com sua conta Google para acessar o PrintCost.",
      },
    ],
  }),
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.59-5.15 3.59-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.93-2.92l-3.86-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l3.99-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function LoginPage() {
  const { configured, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      toast.error("Não foi possível entrar com o Google", {
        description: e instanceof Error ? e.message : undefined,
      });
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
            <Box className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Entrar no PrintCost
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Precificação de impressão 3D em filamento e resina.
          </p>
        </div>

        <Card className="rounded-xl shadow-soft">
          <CardContent className="space-y-5 p-6">
            <Button
              variant="outline"
              className="h-11 w-full"
              onClick={login}
              disabled={busy || !configured}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continuar com o Google
            </Button>

            {!configured ? (
              <div className="space-y-3 rounded-lg border border-dashed p-4 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Login ainda não configurado
                </div>
                <p className="text-muted-foreground">
                  Defina as chaves do seu projeto Supabase no arquivo{" "}
                  <code>.env</code>:
                </p>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {`VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co\nVITE_SUPABASE_ANON_KEY=sua-chave-anon`}
                </pre>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>
                    Supabase → Authentication → Providers → ative o Google.
                  </li>
                  <li>
                    Authentication → URL Configuration → adicione{" "}
                    <code>
                      {typeof window !== "undefined"
                        ? window.location.origin
                        : "https://seu-dominio"}
                      /login
                    </code>{" "}
                    em Redirect URLs.
                  </li>
                  <li>
                    Rode o arquivo <code>supabase/schema.sql</code> no SQL
                    Editor.
                  </li>
                  <li>Reinicie o servidor de desenvolvimento.</li>
                </ol>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Seus dados de cálculo continuam salvos neste navegador.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
