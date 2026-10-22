-- =====================================================================
--  Annuaire Frères en Guerre (FEG) — schéma Supabase
--  Tout est préfixé feg_ : peut être installé dans un projet Supabase déjà utilisé
--  par une autre application, sans rien modifier de l'existant.
--  À coller en entier dans Supabase > SQL Editor > New query > Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- PROFILS (une fiche par membre)
-- ---------------------------------------------------------------------
create table if not exists public.feg_profiles (
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

create or replace function public.feg_is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.feg_profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.feg_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.feg_profiles where id = auth.uid() and status = 'approved' and is_admin);
$$;

-- Création automatique de la fiche à l'inscription (statut "en attente")
-- Uniquement pour les inscriptions faites depuis l'annuaire FEG (marqueur "feg"),
-- pour ne pas toucher aux utilisateurs des autres applications du même projet Supabase.
create or replace function public.feg_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_user_meta_data->>'feg', '') <> 'true' then
    return new;
  end if;
  insert into public.feg_profiles (id, email, prenom, nom, tel, parrain)
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

drop trigger if exists feg_on_auth_user_created on auth.users;
create trigger feg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.feg_handle_new_user();

-- Un membre ne peut pas changer lui-même son statut ni se nommer admin
create or replace function public.feg_protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.feg_is_admin() then
    new.status   := old.status;
    new.is_admin := old.is_admin;
    new.email    := old.email;
  end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists feg_profiles_protect on public.feg_profiles;
create trigger feg_profiles_protect
  before update on public.feg_profiles
  for each row execute function public.feg_protect_profile_fields();

alter table public.feg_profiles enable row level security;

drop policy if exists profiles_select on public.feg_profiles;
create policy profiles_select on public.feg_profiles for select
  using (id = auth.uid() or public.feg_is_admin() or (public.feg_is_approved() and status = 'approved'));

-- Un compte existant (autre application du projet) peut demander l'accès : fiche "en attente" uniquement
drop policy if exists profiles_insert_self on public.feg_profiles;
create policy profiles_insert_self on public.feg_profiles for insert
  with check (id = auth.uid() and status = 'pending' and is_admin = false);

drop policy if exists profiles_update_self on public.feg_profiles;
create policy profiles_update_self on public.feg_profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_update_admin on public.feg_profiles;
create policy profiles_update_admin on public.feg_profiles for update
  using (public.feg_is_admin());

drop policy if exists profiles_delete_admin on public.feg_profiles;
create policy profiles_delete_admin on public.feg_profiles for delete
  using (public.feg_is_admin());

-- ---------------------------------------------------------------------
-- MESSAGERIE
-- ---------------------------------------------------------------------
create table if not exists public.feg_conversations (
  id               uuid primary key default gen_random_uuid(),
  title            text,
  is_group         boolean not null default false,
  is_broadcast     boolean not null default false,   -- "Tous" : visible par tous les membres
  created_by       uuid references public.feg_profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now()
);

create table if not exists public.feg_conversation_members (
  conversation_id  uuid not null references public.feg_conversations(id) on delete cascade,
  user_id          uuid not null references public.feg_profiles(id) on delete cascade,
  last_read_at     timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.feg_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.feg_conversations(id) on delete cascade,
  sender_id        uuid references public.feg_profiles(id) on delete set null default auth.uid(),
  body             text not null check (char_length(body) between 1 and 5000),
  created_at       timestamptz not null default now()
);
create index if not exists feg_messages_conv_idx on public.feg_messages (conversation_id, created_at);

create or replace function public.feg_is_conv_member(p_conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.feg_is_approved() and (
    exists(select 1 from public.feg_conversation_members m where m.conversation_id = p_conv and m.user_id = auth.uid())
    or exists(select 1 from public.feg_conversations c where c.id = p_conv and c.is_broadcast)
  );
$$;

create or replace function public.feg_touch_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.feg_conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end; $$;

drop trigger if exists feg_messages_touch on public.feg_messages;
create trigger feg_messages_touch after insert on public.feg_messages
  for each row execute function public.feg_touch_conversation();

-- Crée (ou retrouve) une conversation avec des membres
create or replace function public.feg_create_conversation(p_member_ids uuid[], p_title text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_me     uuid := auth.uid();
  v_id     uuid;
  v_others uuid[];
begin
  if not public.feg_is_approved() then
    raise exception 'Accès refusé';
  end if;

  select coalesce(array_agg(distinct p.id), '{}') into v_others
  from public.feg_profiles p
  where p.id = any(p_member_ids) and p.id <> v_me and p.status = 'approved';

  if coalesce(array_length(v_others, 1), 0) = 0 then
    raise exception 'Aucun destinataire valide';
  end if;

  if array_length(v_others, 1) = 1 and coalesce(p_title, '') = '' then
    -- conversation privée : on réutilise celle qui existe déjà
    select c.id into v_id
    from public.feg_conversations c
    where c.is_group = false and c.is_broadcast = false
      and exists(select 1 from public.feg_conversation_members m where m.conversation_id = c.id and m.user_id = v_me)
      and exists(select 1 from public.feg_conversation_members m where m.conversation_id = c.id and m.user_id = v_others[1])
    limit 1;
    if v_id is not null then
      return v_id;
    end if;
    insert into public.feg_conversations (is_group, created_by) values (false, v_me) returning id into v_id;
  else
    insert into public.feg_conversations (title, is_group, created_by)
    values (nullif(p_title, ''), true, v_me) returning id into v_id;
  end if;

  insert into public.feg_conversation_members (conversation_id, user_id)
  select v_id, u from unnest(array_append(v_others, v_me)) as u;

  return v_id;
end; $$;

grant execute on function public.feg_create_conversation(uuid[], text) to authenticated;

alter table public.feg_conversations        enable row level security;
alter table public.feg_conversation_members enable row level security;
alter table public.feg_messages             enable row level security;

drop policy if exists conv_select on public.feg_conversations;
create policy conv_select on public.feg_conversations for select using (public.feg_is_conv_member(id));

drop policy if exists conv_update_admin on public.feg_conversations;
create policy conv_update_admin on public.feg_conversations for update using (public.feg_is_admin());

drop policy if exists cm_select on public.feg_conversation_members;
create policy cm_select on public.feg_conversation_members for select using (public.feg_is_conv_member(conversation_id));

drop policy if exists cm_insert_self on public.feg_conversation_members;
create policy cm_insert_self on public.feg_conversation_members for insert
  with check (user_id = auth.uid() and public.feg_is_conv_member(conversation_id));

drop policy if exists cm_update_self on public.feg_conversation_members;
create policy cm_update_self on public.feg_conversation_members for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists msg_select on public.feg_messages;
create policy msg_select on public.feg_messages for select using (public.feg_is_conv_member(conversation_id));

drop policy if exists msg_insert on public.feg_messages;
create policy msg_insert on public.feg_messages for insert
  with check (sender_id = auth.uid() and public.feg_is_conv_member(conversation_id));

drop policy if exists msg_delete on public.feg_messages;
create policy msg_delete on public.feg_messages for delete
  using (sender_id = auth.uid() or public.feg_is_admin());

-- Conversation "Tous" (diffusion à tout le groupe)
insert into public.feg_conversations (title, is_group, is_broadcast)
select 'Frères en Guerre — Tous', true, true
where not exists (select 1 from public.feg_conversations where is_broadcast);

-- Temps réel pour les messages
do $$ begin
  alter publication supabase_realtime add table public.feg_messages;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- RÉALISATIONS & PROJETS
-- ---------------------------------------------------------------------
create table if not exists public.feg_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.feg_profiles(id) on delete cascade default auth.uid(),
  type        text not null default 'projet' check (type in ('projet','realisation','recherche')),
  title       text not null check (char_length(title) between 1 and 200),
  body        text,
  link_url    text,
  image_url   text,
  created_at  timestamptz not null default now()
);

create table if not exists public.feg_post_interests (
  post_id    uuid not null references public.feg_posts(id) on delete cascade,
  user_id    uuid not null references public.feg_profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.feg_posts          enable row level security;
alter table public.feg_post_interests enable row level security;

drop policy if exists posts_select on public.feg_posts;
create policy posts_select on public.feg_posts for select using (public.feg_is_approved());

drop policy if exists posts_insert on public.feg_posts;
create policy posts_insert on public.feg_posts for insert
  with check (author_id = auth.uid() and public.feg_is_approved());

drop policy if exists posts_update on public.feg_posts;
create policy posts_update on public.feg_posts for update
  using (author_id = auth.uid() or public.feg_is_admin());

drop policy if exists posts_delete on public.feg_posts;
create policy posts_delete on public.feg_posts for delete
  using (author_id = auth.uid() or public.feg_is_admin());

drop policy if exists pi_select on public.feg_post_interests;
create policy pi_select on public.feg_post_interests for select using (public.feg_is_approved());

drop policy if exists pi_insert on public.feg_post_interests;
create policy pi_insert on public.feg_post_interests for insert
  with check (user_id = auth.uid() and public.feg_is_approved());

drop policy if exists pi_delete on public.feg_post_interests;
create policy pi_delete on public.feg_post_interests for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- STOCKAGE (photos de profil, images de projets)
-- Chaque membre ne peut écrire que dans son propre dossier : <son id>/...
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('feg-avatars', 'feg-avatars', true), ('feg-posts', 'feg-posts', true)
on conflict (id) do nothing;

drop policy if exists "feg_storage_select" on storage.objects;
create policy "feg_storage_select" on storage.objects for select to authenticated
  using (bucket_id in ('feg-avatars','feg-posts'));

drop policy if exists "feg_storage_insert" on storage.objects;
create policy "feg_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('feg-avatars','feg-posts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "feg_storage_update" on storage.objects;
create policy "feg_storage_update" on storage.objects for update to authenticated
  using (bucket_id in ('feg-avatars','feg-posts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "feg_storage_delete" on storage.objects;
create policy "feg_storage_delete" on storage.objects for delete to authenticated
  using (bucket_id in ('feg-avatars','feg-posts') and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
--  APRÈS VOTRE PREMIÈRE INSCRIPTION SUR LE SITE, lancez ceci
--  (remplacez l'email) pour devenir administrateur :
--
--  update public.feg_profiles set status = 'approved', is_admin = true
--  where email = 'votre.email@exemple.com';
-- =====================================================================
