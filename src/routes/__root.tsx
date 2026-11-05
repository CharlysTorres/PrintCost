import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  Navigate,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { StoreProvider } from "../lib/store";
import { AuthProvider, useAuth } from "../lib/auth";
import { AppShell } from "../components/AppShell";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "PrintCost — Precificação de impressão 3D" },
        {
          name: "description",
          content: "Calcule custos, preços e lucro das suas impressões 3D.",
        },
        { property: "og:title", content: "PrintCost" },
        {
          property: "og:description",
          content: "Precificação e faturamento de impressão 3D.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    }),
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Carregando…
      </div>
    </div>
  );
}

function AppGate() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { configured, loading, session } = useAuth();

  const isPublicStore = path === "/loja" || path.startsWith("/loja/");

  if (configured && loading) return <LoadingScreen />;
  if (configured && !session && path !== "/login" && !isPublicStore)
    return <Navigate to="/login" replace />;
  if (configured && session && path === "/login")
    return <Navigate to="/" replace />;
  if (path === "/login") return <Outlet />;
  if (isPublicStore) return <Outlet />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <AuthProvider>
        <StoreProvider>
          <AppGate />
          <Toaster richColors position="top-right" />
        </StoreProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
