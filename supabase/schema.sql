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
