import type { User } from "@supabase/supabase-js";

/** Nome exibido: metadados do provedor (Google) e, por último, o e-mail. */
export function userName(user: User | null, fallback = "Conta"): string {
  const meta = user?.user_metadata ?? {};
  for (const key of ["full_name", "name"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return user?.email ?? fallback;
}

/** Avatar personalizado no perfil ou, se vazio, a foto da conta Google. */
export function userAvatar(user: User | null): string | undefined {
  const meta = user?.user_metadata ?? {};
  for (const key of ["avatar_url", "picture"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
