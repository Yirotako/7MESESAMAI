-- AMAI / esquema inicial. Ejecuta todo en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.invitation_access (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique,
  access_code_hash text not null,
  status text not null default 'accepted' check (status in ('accepted','denied','pending')),
  response text check (response in ('yes','no')),
  reaccess_requested boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);

create table if not exists public.guest_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  invite_id uuid not null unique references public.invitation_access(id) on delete cascade,
  nickname text not null,
  status text not null default 'accepted' check (status in ('accepted','denied','pending')),
  response text check (response in ('yes','no')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  media_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  correct_answer text not null,
  wrong_answers text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.capsules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  message text not null,
  open_on date not null,
  created_at timestamptz not null default now()
);

alter table public.invitation_access enable row level security;
alter table public.guest_memberships enable row level security;
alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.memories enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.capsules enable row level security;

-- Invitados pueden leer únicamente su propia membresía.
drop policy if exists "guest reads own membership" on public.guest_memberships;
create policy "guest reads own membership" on public.guest_memberships for select to authenticated using (user_id=auth.uid());

-- Contenido público para usuarios autenticados de la invitación.
drop policy if exists "authenticated read settings" on public.site_settings;
create policy "authenticated read settings" on public.site_settings for select to authenticated using (true);
drop policy if exists "authenticated read memories" on public.memories;
create policy "authenticated read memories" on public.memories for select to authenticated using (exists(select 1 from public.guest_memberships g where g.user_id=auth.uid() and g.status='accepted'));
drop policy if exists "authenticated read quiz" on public.quiz_questions;
create policy "authenticated read quiz" on public.quiz_questions for select to authenticated using (exists(select 1 from public.guest_memberships g where g.user_id=auth.uid() and g.status='accepted'));

-- Cada invitado solo ve y gestiona sus cápsulas.
drop policy if exists "guest own capsules" on public.capsules;
create policy "guest own capsules" on public.capsules for all to authenticated using (user_id=auth.uid() and exists(select 1 from public.guest_memberships g where g.user_id=auth.uid() and g.status='accepted')) with check (user_id=auth.uid() and exists(select 1 from public.guest_memberships g where g.user_id=auth.uid() and g.status='accepted'));

-- Función de entrada. El invitado debe tener sesión anónima de Supabase.
create or replace function public.enter_invitation(p_nickname text,p_access_code text)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare v_inv public.invitation_access%rowtype; v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Inicia una sesión para continuar.'; end if;
  select * into v_inv from public.invitation_access where lower(nickname)=lower(trim(p_nickname)) limit 1;
  if not found or crypt(p_access_code,v_inv.access_code_hash)<>v_inv.access_code_hash then
    raise exception 'Usuario o código incorrecto.';
  end if;
  if v_inv.status<>'accepted' then
    return jsonb_build_object('status',v_inv.status);
  end if;
  insert into public.guest_memberships(user_id,invite_id,nickname,status,response)
  values(v_uid,v_inv.id,v_inv.nickname,v_inv.status,v_inv.response)
  on conflict(user_id) do update set invite_id=excluded.invite_id,nickname=excluded.nickname,status=excluded.status,response=excluded.response;
  update public.invitation_access set last_seen=now() where id=v_inv.id;
  return jsonb_build_object('status','accepted');
end $$;

create or replace function public.record_invitation_response(p_response text)
returns void language plpgsql security definer set search_path=public as $$
declare v_inv uuid;
begin
  if p_response not in ('yes','no') then raise exception 'Respuesta no válida.'; end if;
  select invite_id into v_inv from public.guest_memberships where user_id=auth.uid() and status='accepted';
  if v_inv is null then raise exception 'Acceso no autorizado.'; end if;
  update public.invitation_access set response=p_response,status=case when p_response='no' then 'denied' else 'accepted' end,reaccess_requested=false where id=v_inv;
  update public.guest_memberships set response=p_response,status=case when p_response='no' then 'denied' else 'accepted' end where user_id=auth.uid();
end $$;

create or replace function public.request_reaccess()
returns void language plpgsql security definer set search_path=public as $$
declare v_inv uuid;
begin
  select invite_id into v_inv from public.guest_memberships where user_id=auth.uid();
  if v_inv is null then raise exception 'No existe una invitación asociada.'; end if;
  update public.invitation_access set reaccess_requested=true where id=v_inv;
end $$;

create or replace function public.admin_set_invite_status(p_invite_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.admin_users where user_id=auth.uid()) then raise exception 'No autorizado.'; end if;
  if p_status not in ('accepted','denied','pending') then raise exception 'Estado inválido.'; end if;
  update public.invitation_access set status=p_status,reaccess_requested=false where id=p_invite_id;
  update public.guest_memberships set status=p_status where invite_id=p_invite_id;
end $$;

-- El panel solo puede leer/modificar datos de administración.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_users where user_id=auth.uid())
$$;

drop policy if exists "admin manages invitation access" on public.invitation_access;
create policy "admin manages invitation access" on public.invitation_access for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin reads memberships" on public.guest_memberships;
create policy "admin reads memberships" on public.guest_memberships for select to authenticated using (public.is_admin());
drop policy if exists "admin reads admins" on public.admin_users;
create policy "admin reads admins" on public.admin_users for select to authenticated using (user_id=auth.uid() or public.is_admin());
drop policy if exists "admin manages settings" on public.site_settings;
create policy "admin manages settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manages memories" on public.memories;
create policy "admin manages memories" on public.memories for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin manages quiz" on public.quiz_questions;
create policy "admin manages quiz" on public.quiz_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Crear la invitación inicial. Cambia el código antes de ejecutar.
-- Código de acceso inicial sugerido: CAMBIA-ESTE-CODIGO
insert into public.invitation_access(nickname,access_code_hash)
values('YAIR PRUEBA',crypt('CAMBIA-ESTE-CODIGO',gen_salt('bf')))
on conflict(nickname) do nothing;

insert into public.site_settings(key,value) values
('question',to_jsonb('¿Deseas continuar siendo algo bueno?'::text)),
('letter',to_jsonb('Hay cosas que merecen un espacio para recordarse. Estos siete meses tienen momentos, aprendizajes y detalles que forman parte de nuestra historia. Gracias por cada instante que hemos compartido. Ojalá esta pequeña página te saque una sonrisa.'::text)),
('secret_message',to_jsonb('Gracias por formar parte de esta historia.'::text)),
('memories',to_jsonb(E'A veces los detalles pequeños son los que más permanecen.\nHay momentos sencillos que terminan siendo importantes.\nLo bonito también está en lo cotidiano.'::text)),
('start_date',to_jsonb('2026-04-10'::text)),
('modules','{"capsule":true,"quiz":true,"secret":true,"gallery":true}'::jsonb)
on conflict(key) do nothing;

-- Tras crear tu usuario administrador en Authentication > Users,
-- sustituye el UUID y ejecuta:
-- insert into public.admin_users(user_id) values ('UUID-DE-TU-USUARIO-ADMIN');
