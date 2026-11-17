-- =========================================================
-- רחלי מן – מסד הנתונים של האתר הציבורי (Supabase / Postgres)
-- מבקרים: קוראים גלריה, המלצות ושאלות, ושולחים פנייה.
-- מנהלת (אימייל בטבלת admins): עורכת הכל ומעלה תמונות.
-- =========================================================
create extension if not exists pgcrypto;

create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.site_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  cat text not null check (cat in ('newborn','outdoor','family','studio')),
  asset text not null,
  thumb text default '',
  w int default 0,
  h int default 0,
  title text not null default '' check (char_length(title) <= 120),
  cover boolean not null default false,
  ord double precision not null default (extract(epoch from now()) * 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null default '' check (char_length(name) <= 80),
  service text not null default '' check (char_length(service) <= 60),
  body text not null default '' check (char_length(body) <= 2000),
  asset text not null default '',
  thumb text default '',
  w int default 0,
  h int default 0,
  ord double precision not null default (extract(epoch from now()) * 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.faq (
  id uuid primary key default gen_random_uuid(),
  q text not null check (char_length(q) between 1 and 300),
  a text not null default '' check (char_length(a) <= 3000),
  ord double precision not null default (extract(epoch from now()) * 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (char_length(phone) between 7 and 30),
  service text not null default '' check (char_length(service) <= 60),
  message text not null default '' check (char_length(message) <= 1500),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.admins      enable row level security;
alter table public.site_config enable row level security;
alter table public.gallery     enable row level security;
alter table public.reviews     enable row level security;
alter table public.faq         enable row level security;
alter table public.leads       enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.site_config, public.gallery, public.reviews, public.faq to anon, authenticated;
grant insert, update, delete on public.site_config, public.gallery, public.reviews, public.faq to authenticated;
grant insert on public.leads to anon, authenticated;
grant select, update, delete on public.leads to authenticated;

do $$
declare t text;
begin
  foreach t in array array['site_config','gallery','reviews','faq'] loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "anyone can send a lead" on public.leads;
create policy "anyone can send a lead" on public.leads for insert to anon, authenticated with check (done = false);
drop policy if exists "admin reads leads" on public.leads;
create policy "admin reads leads" on public.leads for select to authenticated using (public.is_admin());
drop policy if exists "admin updates leads" on public.leads;
create policy "admin updates leads" on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes leads" on public.leads;
create policy "admin deletes leads" on public.leads for delete to authenticated using (public.is_admin());

-- photos: public to view, only the admin uploads or deletes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 20971520, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin list" on storage.objects;
create policy "media admin list" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_admin());

insert into public.site_config (key, value) values ('main', '{}'::jsonb) on conflict (key) do nothing;
