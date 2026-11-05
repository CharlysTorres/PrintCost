-- PrintCost — estado do app por usuário
-- Filamentos, resinas, impressoras, pedidos e configurações vivem em um único
-- documento JSONB por usuário. Rode este arquivo no Supabase → SQL Editor.

create table if not exists public.printcost_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.printcost_state enable row level security;

drop policy if exists "printcost_state_select_own" on public.printcost_state;
create policy "printcost_state_select_own"
  on public.printcost_state for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "printcost_state_insert_own" on public.printcost_state;
create policy "printcost_state_insert_own"
  on public.printcost_state for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "printcost_state_update_own" on public.printcost_state;
create policy "printcost_state_update_own"
  on public.printcost_state for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "printcost_state_delete_own" on public.printcost_state;
create policy "printcost_state_delete_own"
  on public.printcost_state for delete to authenticated
  using (auth.uid() = user_id);

-- Mantém updated_at coerente mesmo com upsert manual.
create or replace function public.printcost_state_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists printcost_state_touch on public.printcost_state;
create trigger printcost_state_touch
  before update on public.printcost_state
  for each row execute function public.printcost_state_touch();

-- Tempo real entre dispositivos (Supabase Realtime).
alter table public.printcost_state replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'printcost_state'
  ) then
    alter publication supabase_realtime add table public.printcost_state;
  end if;
end $$;

-- Exclusão da própria conta: apaga o documento sincronizado e o usuário do Auth.
-- SECURITY DEFINER para poder remover de auth.users; execução só para logados.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from public.printcost_state where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;

-- Loja pública -------------------------------------------------------------
-- A vitrine é um espelho público dos produtos do usuário, acessível pelo slug.
create table if not exists public.printcost_storefronts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  slug text not null unique,
  name text not null default '',
  products jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.printcost_storefronts enable row level security;

drop policy if exists "printcost_storefronts_owner" on public.printcost_storefronts;
create policy "printcost_storefronts_owner"
  on public.printcost_storefronts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Qualquer visitante pode ler a vitrine (nome, slug e produtos).
drop policy if exists "printcost_storefronts_public_read" on public.printcost_storefronts;
create policy "printcost_storefronts_public_read"
  on public.printcost_storefronts for select to anon, authenticated
  using (true);

create or replace function public.printcost_storefronts_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists printcost_storefronts_touch on public.printcost_storefronts;
create trigger printcost_storefronts_touch
  before update on public.printcost_storefronts
  for each row execute function public.printcost_storefronts_touch();

-- Pedidos feitos na loja pública. O cliente não faz login, então a escrita
-- acontece só pela função abaixo (security definer).
create table if not exists public.printcost_store_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  items jsonb not null default '[]'::jsonb,
  total numeric(12, 2) not null default 0,
  status text not null default 'Orçamento',
  created_at timestamptz not null default now()
);

create index if not exists printcost_store_orders_user_idx
  on public.printcost_store_orders (user_id, created_at desc);

alter table public.printcost_store_orders enable row level security;

drop policy if exists "printcost_store_orders_select_own" on public.printcost_store_orders;
create policy "printcost_store_orders_select_own"
  on public.printcost_store_orders for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "printcost_store_orders_update_own" on public.printcost_store_orders;
create policy "printcost_store_orders_update_own"
  on public.printcost_store_orders for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "printcost_store_orders_delete_own" on public.printcost_store_orders;
create policy "printcost_store_orders_delete_own"
  on public.printcost_store_orders for delete to authenticated
  using (auth.uid() = user_id);

-- Cria o pedido do cliente a partir do slug da loja, sem expor o user_id.
create or replace function public.printcost_create_store_order(
  p_slug text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_items jsonb,
  p_total numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_id uuid;
begin
  if coalesce(trim(p_customer_name), '') = ''
     or coalesce(trim(p_customer_email), '') = ''
     or coalesce(trim(p_customer_phone), '') = '' then
    raise exception 'dados do cliente incompletos';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'pedido vazio';
  end if;
  select s.user_id into v_user_id
    from public.printcost_storefronts s
   where s.slug = lower(trim(p_slug));
  if v_user_id is null then
    raise exception 'loja nao encontrada';
  end if;
  insert into public.printcost_store_orders
    (user_id, customer_name, customer_email, customer_phone, items, total)
  values
    (v_user_id, trim(p_customer_name), trim(p_customer_email), trim(p_customer_phone), p_items, greatest(p_total, 0))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.printcost_create_store_order(text, text, text, text, jsonb, numeric) from public;
grant execute on function public.printcost_create_store_order(text, text, text, text, jsonb, numeric) to anon, authenticated;
