-- =====================================================================
--  Annuaire Frères en Guerre (FEG) — schéma Supabase
--  À coller en entier dans Supabase > SQL Editor > New query > Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- PROFILS (une fiche par membre)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  prenom        text not null default '',
  nom           text not null default '',
  ville         text,
  tel           text,
  show_tel      boolean not null default true,
  famille       text,
  langues       text,
  titre         text,
  entreprise    text,
  secteur       text,
  linkedin_url  text,
  competences   text[] not null default '{}',
  parcours      jsonb  not null default '[]'::jsonb,  -- [{poste, org, dates}]
  assos         jsonb  not null default '[]'::jsonb,  -- [{nom, role}]
  bio           text,
  avatar_url    text,
  parrain       text,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and status = 'approved' and is_admin);
$$;

-- Création automatique de la fiche à l'inscription (statut "en attente")
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, prenom, nom, tel, parrain)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'prenom', ''),
    coalesce(new.raw_user_meta_data->>'nom', ''),
    new.raw_user_meta_data->>'tel',
    new.raw_user_meta_data->>'parrain'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un membre ne peut pas changer lui-même son statut ni se nommer admin
create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status   := old.status;
    new.is_admin := old.is_admin;
    new.email    := old.email;
  end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_admin() or (public.is_approved() and status = 'approved'));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update
  using (public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- MESSAGERIE
-- ---------------------------------------------------------------------
create table if not exists public.conversations (
  id               uuid primary key default gen_random_uuid(),
  title            text,
  is_group         boolean not null default false,
  is_broadcast     boolean not null default false,   -- "Tous" : visible par tous les membres
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  last_read_at     timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid references public.profiles(id) on delete set null default auth.uid(),
  body             text not null check (char_length(body) between 1 and 5000),
  created_at       timestamptz not null default now()
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

create or replace function public.is_conv_member(p_conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_approved() and (
    exists(select 1 from public.conversation_members m where m.conversation_id = p_conv and m.user_id = auth.uid())
    or exists(select 1 from public.conversations c where c.id = p_conv and c.is_broadcast)
  );
$$;

create or replace function public.touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end; $$;

drop trigger if exists messages_touch on public.messages;
create trigger messages_touch after insert on public.messages
  for each row execute function public.touch_conversation();

-- Crée (ou retrouve) une conversation avec des membres
create or replace function public.create_conversation(p_member_ids uuid[], p_title text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_id     uuid;
  v_others uuid[];
begin
  if not public.is_approved() then
    raise exception 'Accès refusé';
  end if;

  select coalesce(array_agg(distinct p.id), '{}') into v_others
  from public.profiles p
  where p.id = any(p_member_ids) and p.id <> v_me and p.status = 'approved';

  if coalesce(array_length(v_others, 1), 0) = 0 then
    raise exception 'Aucun destinataire valide';
  end if;

  if array_length(v_others, 1) = 1 and coalesce(p_title, '') = '' then
    -- conversation privée : on réutilise celle qui existe déjà
    select c.id into v_id
    from public.conversations c
    where c.is_group = false and c.is_broadcast = false
      and exists(select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = v_me)
      and exists(select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = v_others[1])
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
    insert into public.conversations (is_group, created_by) values (false, v_me) returning id into v_id;
  else
    insert into public.conversations (title, is_group, created_by)
    values (nullif(p_title, ''), true, v_me) returning id into v_id;
  end if;

  insert into public.conversation_members (conversation_id, user_id)
  select v_id, u from unnest(array_append(v_others, v_me)) as u;

  return v_id;
end; $$;

grant execute on function public.create_conversation(uuid[], text) to authenticated;

alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;

drop policy if exists conv_select on public.conversations;
create policy conv_select on public.conversations for select using (public.is_conv_member(id));

drop policy if exists conv_update_admin on public.conversations;
create policy conv_update_admin on public.conversations for update using (public.is_admin());

drop policy if exists cm_select on public.conversation_members;
create policy cm_select on public.conversation_members for select using (public.is_conv_member(conversation_id));

drop policy if exists cm_insert_self on public.conversation_members;
create policy cm_insert_self on public.conversation_members for insert
  with check (user_id = auth.uid() and public.is_conv_member(conversation_id));

drop policy if exists cm_update_self on public.conversation_members;
create policy cm_update_self on public.conversation_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists msg_select on public.messages;
create policy msg_select on public.messages for select using (public.is_conv_member(conversation_id));

drop policy if exists msg_insert on public.messages;
create policy msg_insert on public.messages for insert
  with check (sender_id = auth.uid() and public.is_conv_member(conversation_id));

drop policy if exists msg_delete on public.messages;
create policy msg_delete on public.messages for delete
  using (sender_id = auth.uid() or public.is_admin());

-- Conversation "Tous" (diffusion à tout le groupe)
insert into public.conversations (title, is_group, is_broadcast)
select 'Frères en Guerre — Tous', true, true
where not exists (select 1 from public.conversations where is_broadcast);

-- Temps réel pour les messages
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- RÉALISATIONS & PROJETS
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  type        text not null default 'projet' check (type in ('projet','realisation','recherche')),
  title       text not null check (char_length(title) between 1 and 200),
  body        text,
  link_url    text,
  image_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.post_interests (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.posts          enable row level security;
alter table public.post_interests enable row level security;

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select using (public.is_approved());

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert
  with check (author_id = auth.uid() and public.is_approved());

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists pi_select on public.post_interests;
create policy pi_select on public.post_interests for select using (public.is_approved());

drop policy if exists pi_insert on public.post_interests;
create policy pi_insert on public.post_interests for insert
  with check (user_id = auth.uid() and public.is_approved());

drop policy if exists pi_delete on public.post_interests;
create policy pi_delete on public.post_interests for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- STOCKAGE (photos de profil, images de projets)
-- Chaque membre ne peut écrire que dans son propre dossier : <son id>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('posts', 'posts', true)
on conflict (id) do nothing;

drop policy if exists "feg_storage_select" on storage.objects;
create policy "feg_storage_select" on storage.objects for select to authenticated
  using (bucket_id in ('avatars','posts'));

drop policy if exists "feg_storage_insert" on storage.objects;
create policy "feg_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','posts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "feg_storage_update" on storage.objects;
create policy "feg_storage_update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','posts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "feg_storage_delete" on storage.objects;
create policy "feg_storage_delete" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','posts') and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
--  APRÈS VOTRE PREMIÈRE INSCRIPTION SUR LE SITE, lancez ceci
--  (remplacez l'email) pour devenir administrateur :
--
--  update public.profiles set status = 'approved', is_admin = true
--  where email = 'votre.email@exemple.com';
-- =====================================================================
