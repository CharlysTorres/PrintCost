import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Box,
  Calculator,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Printer,
  Receipt,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { initialsOf, userAvatar, userName } from "@/lib/profile";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calculadora", label: "Calculadora", icon: Calculator },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/filamentos", label: "Filamentos", icon: Box },
  { to: "/resinas", label: "Resinas", icon: FlaskConical },
  { to: "/impressoras", label: "Impressoras", icon: Printer },
  { to: "/pedidos", label: "Pedidos", icon: Receipt },
  { to: "/perfil", label: "Perfil", icon: UserRound },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = to === "/" ? path === "/" : path.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-soft">
        <Box className="h-4 w-4" />
      </div>
      <span className="font-display text-lg font-semibold tracking-tight">
        PrintCost
      </span>
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link to="/login">Entrar</Link>
      </Button>
    );
  }

  const name = userName(user);
  const avatarUrl = userAvatar(user);
  const initials = initialsOf(name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Menu da conta"
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="text-[11px]">
              {initials || "EU"}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserRound className="h-4 w-4" />
            Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/configuracoes">
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void signOut().catch(() => toast.error("Não foi possível sair"));
          }}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const current = NAV.find((n) =>
    n.to === "/" ? path === "/" : path.startsWith(n.to),
  );

  useEffect(() => {
    const d = localStorage.getItem("printcost:theme") === "dark";
    setDark(d);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const toggle = () => {
    const n = !dark;
    setDark(n);
    localStorage.setItem("printcost:theme", n ? "dark" : "light");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-8 border-r bg-sidebar p-4 lg:flex">
        <Brand />
        <NavList />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-4">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="mb-8 mt-2">
            <Brand />
          </div>
          <NavList onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="text-sm text-muted-foreground">
            PrintCost <span className="mx-1.5">/</span>
            <span className="font-medium text-foreground">
              {current?.label ?? "—"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Alternar tema"
            >
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof Box;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
