-- =====================================================================
--  Annuaire FEG — « Mon lien avec … » (notes personnelles entre membres)
--  À lancer UNE FOIS dans Supabase > SQL Editor.
--  Chaque note est PRIVÉE : seul son auteur peut la lire ou la modifier.
-- =====================================================================

create table if not exists public.feg_relations (
  owner_id    uuid not null references public.feg_profiles(id) on delete cascade default auth.uid(),
  member_id   uuid not null references public.feg_profiles(id) on delete cascade,
  level       text not null default 'croise' check (level in ('proche','croise','pas_encore')),
  context     text check (char_length(context) <= 200),
  note        text check (char_length(note) <= 4000),
  updated_at  timestamptz not null default now(),
  primary key (owner_id, member_id),
  check (owner_id <> member_id)
);

alter table public.feg_relations enable row level security;

drop policy if exists rel_select_own on public.feg_relations;
create policy rel_select_own on public.feg_relations for select using (owner_id = auth.uid());

drop policy if exists rel_insert_own on public.feg_relations;
create policy rel_insert_own on public.feg_relations for insert
  with check (owner_id = auth.uid() and public.feg_is_approved());

drop policy if exists rel_update_own on public.feg_relations;
create policy rel_update_own on public.feg_relations for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists rel_delete_own on public.feg_relations;
create policy rel_delete_own on public.feg_relations for delete using (owner_id = auth.uid());
