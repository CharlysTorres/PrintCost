/**
 * Teste automatizado das políticas RLS do PrintCost.
 *
 * Cria dois usuários descartáveis no Auth, autentica via senha e verifica:
 * inserção/leitura do próprio documento, isolamento entre usuários, bloqueio
 * de escrita anônima, entrega via Realtime e exclusão da conta em cascata.
 *
 * Requer no .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e
 * SUPABASE_DB_PASSWORD (senha do banco, sem prefixo VITE_).
 *
 * Uso: bun run test:rls
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(import.meta.dirname, "..");

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const env = loadEnv(path.join(root, ".env"));
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
const dbPassword = env.SUPABASE_DB_PASSWORD;

if (!url || !anon || !dbPassword) {
  console.error(
    "Faltam VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY ou SUPABASE_DB_PASSWORD no .env",
  );
  process.exit(1);
}

const ref = new URL(url).hostname.split(".")[0];
const runId = Date.now().toString(36);
const created = [];
let failures = 0;

function check(label, ok, detail = "") {
  console.log(
    `${ok ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!ok) failures += 1;
}

const admin = new Client({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  user: "postgres",
  password: dbPassword,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await admin.connect();
await admin.query(
  "create extension if not exists pgcrypto with schema extensions",
);

function rest(pathname, options = {}) {
  const headers = { apikey: anon, "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.prefer) headers.Prefer = options.prefer;
  return fetch(`${url}/rest/v1/${pathname}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function makeUser(label) {
  const id = randomUUID();
  const email = `printcost-rls-${label}-${runId}@example.com`;
  const password = `Tc!${runId}${label}Aa9`;
  const { rows } = await admin.query(
    "select extensions.crypt($1, extensions.gen_salt('bf')) as hash",
    [password],
  );
  await admin.query(
    `insert into auth.users
       (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     values
       ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated',
        $2, $3, now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())`,
    [id, email, rows[0].hash],
  );
  created.push(id);
  // O GoTrue lê esses campos como string; NULL faz o login responder 500.
  await admin.query(
    `update auth.users set
       confirmation_token = '',
       recovery_token = '',
       email_change_token_new = '',
       email_change_token_current = '',
       email_change = '',
       phone_change = '',
       phone_change_token = '',
       reauthentication_token = '',
       is_super_admin = false
     where id = $1`,
    [id],
  );
  try {
    await admin.query(
      `insert into auth.identities
         (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
       values
         (gen_random_uuid(), $1::uuid, jsonb_build_object('sub', ($1::uuid)::text, 'email', $2::text), 'email', ($1::uuid)::text, now(), now(), now())`,
      [id, email],
    );
  } catch {
    await admin.query(
      `insert into auth.identities
         (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values
         (gen_random_uuid(), $1::uuid, jsonb_build_object('sub', ($1::uuid)::text, 'email', $2::text), 'email', now(), now(), now())`,
      [id, email],
    );
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await response.json();
  if (!response.ok) {
    throw new Error(
      `login de teste falhou (${response.status}): ${session.error_description || session.msg || session.message}`,
    );
  }
  return {
    id,
    email,
    token: session.access_token,
    refresh: session.refresh_token,
  };
}

let realtimeClient;
let channel;

try {
  const userA = await makeUser("a");
  const userB = await makeUser("b");

  const insertA = await rest("printcost_state", {
    method: "POST",
    token: userA.token,
    prefer: "return=representation",
    body: { user_id: userA.id, data: { owner: "a" } },
  });
  check(
    "A insere o próprio documento",
    insertA.status === 201,
    `HTTP ${insertA.status}`,
  );

  const selectA = await rest(
    `printcost_state?select=user_id,data&user_id=eq.${userA.id}`,
    { token: userA.token },
  );
  const rowsA = await selectA.json();
  check(
    "A lê o próprio documento",
    selectA.status === 200 &&
      rowsA.length === 1 &&
      rowsA[0]?.data?.owner === "a",
  );

  const selectB = await rest("printcost_state?select=user_id", {
    token: userB.token,
  });
  const rowsB = await selectB.json();
  check(
    "B não vê o documento de A",
    selectB.status === 200 && rowsB.length === 0,
    `${rowsB.length} linha(s)`,
  );

  const patchB = await rest(`printcost_state?user_id=eq.${userA.id}`, {
    method: "PATCH",
    token: userB.token,
    prefer: "return=minimal",
    body: { data: { owner: "b" } },
  });
  check(
    "B não altera o documento de A",
    patchB.status === 204,
    `HTTP ${patchB.status}`,
  );
  const afterPatch = await rest(
    `printcost_state?select=data&user_id=eq.${userA.id}`,
    { token: userA.token },
  );
  const patchedRows = await afterPatch.json();
  check(
    "documento de A permanece intacto após PATCH de B",
    patchedRows[0]?.data?.owner === "a",
  );

  const deleteB = await rest(`printcost_state?user_id=eq.${userA.id}`, {
    method: "DELETE",
    token: userB.token,
    prefer: "return=minimal",
  });
  check(
    "B não apaga o documento de A",
    deleteB.status === 204,
    `HTTP ${deleteB.status}`,
  );
  const afterDelete = await rest(
    `printcost_state?select=user_id&user_id=eq.${userA.id}`,
    { token: userA.token },
  );
  const deletedRows = await afterDelete.json();
  check("documento de A continua existindo", deletedRows.length === 1);

  const anonSelect = await rest("printcost_state?select=user_id");
  const anonRows = await anonSelect.json();
  check(
    "anônimo não enxerga linhas",
    anonSelect.status === 200 && anonRows.length === 0,
    `${anonRows.length} linha(s)`,
  );

  const anonInsert = await rest("printcost_state", {
    method: "POST",
    body: { user_id: randomUUID(), data: {} },
  });
  check(
    "anônimo não pode inserir",
    [401, 403].includes(anonInsert.status),
    `HTTP ${anonInsert.status}`,
  );

  realtimeClient = createClient(url, anon);
  const { error: sessionError } = await realtimeClient.auth.setSession({
    access_token: userA.token,
    refresh_token: userA.refresh,
  });
  check(
    "sessão autenticada criada para o Realtime",
    !sessionError,
    sessionError?.message,
  );
  // O canal Postgres Changes usa o JWT da sessão para aplicar as RLS.
  realtimeClient.realtime.setAuth(userA.token);

  let resolveEvent;
  let rejectEvent;
  const eventReceived = new Promise((resolve, reject) => {
    resolveEvent = resolve;
    rejectEvent = reject;
  });
  eventReceived.catch(() => undefined);
  const eventTimer = setTimeout(
    () => rejectEvent(new Error("tempo esgotado aguardando evento")),
    15000,
  );

  channel = realtimeClient.channel(`rls-test-${runId}`);
  channel.on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "printcost_state",
      filter: `user_id=eq.${userA.id}`,
    },
    (payload) => {
      clearTimeout(eventTimer);
      resolveEvent(payload);
    },
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("tempo esgotado ao assinar o canal")),
      15000,
    );
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve();
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        clearTimeout(timer);
        reject(new Error(`canal Realtime: ${status}`));
      }
    });
  });
  check("canal Realtime autenticado assinado", true);

  await rest(`printcost_state?user_id=eq.${userA.id}`, {
    method: "PATCH",
    token: userA.token,
    prefer: "return=minimal",
    body: { data: { owner: "a", version: 2 } },
  });
  const event = await eventReceived;
  check(
    "Realtime entrega a alteração do próprio documento",
    event?.new?.user_id === userA.id,
  );
  check(
    "Realtime entrega o conteúdo atualizado",
    event?.new?.data?.version === 2,
  );
  await realtimeClient.removeChannel(channel);
  channel = null;

  const rpc = await fetch(`${url}/rest/v1/rpc/delete_my_account`, {
    method: "POST",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${userA.token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  check(
    "RPC delete_my_account executa para o próprio usuário",
    [200, 204].includes(rpc.status),
    `HTTP ${rpc.status}`,
  );
  const userGone = await admin.query(
    "select count(*)::int as n from auth.users where id = $1",
    [userA.id],
  );
  check("usuário removido do Auth", userGone.rows[0].n === 0);
  const stateGone = await admin.query(
    "select count(*)::int as n from public.printcost_state where user_id = $1",
    [userA.id],
  );
  check("documento removido em cascata", stateGone.rows[0].n === 0);
  void userB;
} catch (error) {
  check(
    "execução do teste",
    false,
    error instanceof Error ? error.message : String(error),
  );
} finally {
  if (channel && realtimeClient) {
    await realtimeClient.removeChannel(channel).catch(() => undefined);
    channel = null;
  }
  realtimeClient?.realtime.disconnect();
  for (const id of created) {
    await admin
      .query("delete from auth.users where id = $1", [id])
      .catch(() => undefined);
  }
  const leftovers = await admin.query(
    "select count(*)::int as n from public.printcost_state where user_id = any($1::uuid[])",
    [created],
  );
  check(
    "nenhum dado órfão após excluir as contas de teste",
    leftovers.rows[0].n === 0,
    `${leftovers.rows[0].n} linha(s)`,
  );
  await admin.end();
  console.log(
    failures
      ? `\n${failures} verificação(ões) falharam`
      : "\nTodas as verificações passaram",
  );
  process.exitCode = failures ? 1 : 0;
}
