import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Save, ShieldAlert, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { initialsOf, userAvatar, userName } from "@/lib/profile";
import { clearLocalData } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — PrintCost" },
      {
        name: "description",
        content: "Gerencie seu nome, avatar e conta do PrintCost.",
      },
      { property: "og:title", content: "Perfil — PrintCost" },
      {
        property: "og:description",
        content: "Gerencie seu nome, avatar e conta do PrintCost.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { configured, user } = useAuth();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const meta = user.user_metadata ?? {};
    const fullName = meta["full_name"];
    setName(typeof fullName === "string" ? fullName : "");
    const customAvatar = meta["avatar_url"];
    setAvatar(typeof customAvatar === "string" ? customAvatar : "");
  }, [user]);

  if (!configured) {
    return (
      <div className="max-w-2xl">
        <PageHeader
          title="Perfil"
          description="Seu nome e avatar aparecem no app."
        />
        <Card className="rounded-xl shadow-soft">
          <CardContent className="space-y-3 p-6">
            <p className="text-sm text-muted-foreground">
              O login ainda não está configurado neste ambiente. Configure o
              Supabase para gerenciar sua conta.
            </p>
            <Button asChild variant="outline">
              <Link to="/login">Como configurar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  const previewName = name.trim() || userName(user);
  const previewAvatar = avatar.trim() || userAvatar(user);
  const initials = initialsOf(previewName);
  const createdAt = new Date(user.created_at).toLocaleDateString("pt-BR");

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim(),
          avatar_url: avatar.trim(),
        },
      });
      if (error) throw error;
      toast.success("Perfil atualizado");
    } catch (error) {
      toast.error("Não foi possível salvar o perfil", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async () => {
    if (!supabase) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw error;
      clearLocalData();
      await supabase.auth.signOut({ scope: "local" });
      toast.success("Conta excluída", {
        description: "Todos os dados sincronizados foram removidos.",
      });
      window.location.assign("/login");
    } catch (error) {
      setDeleting(false);
      setConfirmOpen(false);
      toast.error("Não foi possível excluir a conta", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Perfil"
        description="Seu nome e avatar aparecem no app e nos orçamentos."
      />

      <Card className="rounded-xl shadow-soft">
        <CardHeader>
          <CardTitle>Conta Google</CardTitle>
          <CardDescription>
            Filamentos, resinas, impressoras e pedidos ficam vinculados a esta
            conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={previewAvatar} alt={previewName} />
              <AvatarFallback className="text-lg">
                {initials || "EU"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{previewName}</div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Conta criada em {createdAt}
              </div>
            </div>
          </div>

          <form onSubmit={save} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome de exibição</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-avatar">URL do avatar</Label>
              <Input
                id="profile-avatar"
                type="url"
                value={avatar}
                onChange={(event) => setAvatar(event.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar a foto da sua conta Google.
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar perfil
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6 rounded-xl border-destructive/40 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            Excluir conta
          </CardTitle>
          <CardDescription>
            Apaga sua conta e todos os dados sincronizados na nuvem: filamentos,
            resinas, impressoras, pedidos e configurações. Esta ação não pode
            ser desfeita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4" />
                Excluir conta e dados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sua conta Google no PrintCost será apagada junto com todos os
                  dados sincronizados. Você poderá entrar novamente, mas
                  começará do zero.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deleting}
                  onClick={(event) => {
                    event.preventDefault();
                    void removeAccount();
                  }}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Excluir definitivamente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
