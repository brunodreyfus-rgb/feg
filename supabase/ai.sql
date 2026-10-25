-- =====================================================================
--  Annuaire FEG — module IA (synergies)
--  À lancer UNE FOIS dans Supabase > SQL Editor (après schema.sql).
--  Garde l'historique des réponses de l'IA : sert de cache (24 h) et
--  de limite d'usage par membre.
-- =====================================================================

create table if not exists public.feg_ai_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.feg_profiles(id) on delete cascade default auth.uid(),
  kind        text not null check (kind in ('synergies','project','ask','admin')),
  key         text not null default '',
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists feg_ai_runs_user_idx on public.feg_ai_runs (user_id, created_at desc);

alter table public.feg_ai_runs enable row level security;

drop policy if exists ai_select_own on public.feg_ai_runs;
create policy ai_select_own on public.feg_ai_runs for select
  using (user_id = auth.uid());

drop policy if exists ai_insert_own on public.feg_ai_runs;
create policy ai_insert_own on public.feg_ai_runs for insert
  with check (user_id = auth.uid() and public.feg_is_approved());
