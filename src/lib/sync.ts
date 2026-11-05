import { supabase } from "./supabase";

const TABLE = "printcost_state";

export interface RemoteState {
  data: unknown;
  updatedAt: number;
}

/** Lê o estado salvo na nuvem para o usuário logado. */
export async function fetchRemoteState(
  userId: string,
): Promise<RemoteState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("data, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as { data: unknown; updated_at: string };
  return { data: row.data, updatedAt: new Date(row.updated_at).getTime() || 0 };
}

/** Escuta alterações do estado do usuário em tempo real (outros dispositivos/abas). */
export function subscribeToRemoteState(
  userId: string,
  onChange: (state: RemoteState) => void,
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`printcost_state:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLE,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as {
          data?: unknown;
          updated_at?: string;
        } | null;
        if (!row?.data) return;
        onChange({
          data: row.data,
          updatedAt: row.updated_at
            ? new Date(row.updated_at).getTime()
            : Date.now(),
        });
      },
    )
    .subscribe();

  return () => {
    void supabase?.removeChannel(channel);
  };
}

/** Grava (upsert) o estado do usuário logado. */
export async function pushRemoteState(
  userId: string,
  data: unknown,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
