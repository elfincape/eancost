-- Eancost initial schema for Supabase
-- Apply this file in Supabase SQL Editor or via Supabase CLI.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  center_id uuid references public.centers(id) on delete set null,
  name text not null,
  phone text,
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  driver_id uuid references public.drivers(id) on delete set null,
  vehicle_number text not null unique,
  vehicle_type text not null check (vehicle_type in ('fixed', 'temporary')),
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  uploaded_by uuid references public.profiles(id) on delete set null,
  original_filename text not null,
  storage_path text,
  file_type text not null check (file_type in ('billing', 'payment')),
  file_size_bytes bigint,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'completed', 'failed')),
  error_message text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settlement_batches (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  uploaded_file_id uuid references public.uploaded_files(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  batch_type text not null check (batch_type in ('billing', 'payment')),
  settlement_month date not null,
  title text,
  status text not null default 'draft' check (status in ('draft', 'validated', 'compared', 'confirmed', 'failed')),
  row_count integer not null default 0,
  total_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settlement_month_is_first_day check (settlement_month = date_trunc('month', settlement_month)::date)
);

create table if not exists public.settlement_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.settlement_batches(id) on delete cascade,
  center_id uuid not null references public.centers(id) on delete restrict,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  settlement_month date not null,
  row_number integer not null,
  vehicle_number text,
  driver_name text,
  route_name text,
  raw_data jsonb not null default '{}'::jsonb,
  amount numeric(14, 2) not null default 0,
  billing_amount numeric(14, 2),
  payment_amount numeric(14, 2),
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'invalid')),
  validation_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settlement_rows_month_is_first_day check (settlement_month = date_trunc('month', settlement_month)::date)
);

create table if not exists public.comparison_results (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  settlement_month date not null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  vehicle_number text not null,
  driver_id uuid references public.drivers(id) on delete set null,
  billing_batch_id uuid references public.settlement_batches(id) on delete set null,
  payment_batch_id uuid references public.settlement_batches(id) on delete set null,
  billing_amount numeric(14, 2) not null default 0,
  payment_amount numeric(14, 2) not null default 0,
  difference_amount numeric(14, 2) generated always as (billing_amount - payment_amount) stored,
  status text not null default 'needs_review' check (status in ('matched', 'needs_review', 'confirmed')),
  memo text,
  compared_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comparison_results_month_is_first_day check (settlement_month = date_trunc('month', settlement_month)::date)
);

create index if not exists drivers_center_id_idx on public.drivers(center_id);
create index if not exists vehicles_center_id_idx on public.vehicles(center_id);
create index if not exists vehicles_driver_id_idx on public.vehicles(driver_id);
create index if not exists vehicles_vehicle_number_idx on public.vehicles(vehicle_number);
create index if not exists uploaded_files_center_uploaded_at_idx on public.uploaded_files(center_id, uploaded_at desc);
create index if not exists settlement_batches_center_month_idx on public.settlement_batches(center_id, settlement_month);
create index if not exists settlement_batches_type_idx on public.settlement_batches(batch_type);
create index if not exists settlement_rows_batch_id_idx on public.settlement_rows(batch_id);
create index if not exists settlement_rows_center_month_idx on public.settlement_rows(center_id, settlement_month);
create index if not exists settlement_rows_vehicle_number_idx on public.settlement_rows(vehicle_number);
create index if not exists comparison_results_center_month_idx on public.comparison_results(center_id, settlement_month);
create index if not exists comparison_results_vehicle_number_idx on public.comparison_results(vehicle_number);

drop trigger if exists set_profiles_updated_at on public.profiles;
drop trigger if exists set_centers_updated_at on public.centers;
drop trigger if exists set_drivers_updated_at on public.drivers;
drop trigger if exists set_vehicles_updated_at on public.vehicles;
drop trigger if exists set_uploaded_files_updated_at on public.uploaded_files;
drop trigger if exists set_settlement_batches_updated_at on public.settlement_batches;
drop trigger if exists set_settlement_rows_updated_at on public.settlement_rows;
drop trigger if exists set_comparison_results_updated_at on public.comparison_results;

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_centers_updated_at before update on public.centers for each row execute function public.set_updated_at();
create trigger set_drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();
create trigger set_vehicles_updated_at before update on public.vehicles for each row execute function public.set_updated_at();
create trigger set_uploaded_files_updated_at before update on public.uploaded_files for each row execute function public.set_updated_at();
create trigger set_settlement_batches_updated_at before update on public.settlement_batches for each row execute function public.set_updated_at();
create trigger set_settlement_rows_updated_at before update on public.settlement_rows for each row execute function public.set_updated_at();
create trigger set_comparison_results_updated_at before update on public.comparison_results for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.centers enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.uploaded_files enable row level security;
alter table public.settlement_batches enable row level security;
alter table public.settlement_rows enable row level security;
alter table public.comparison_results enable row level security;

create policy "profiles are readable by owner or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "admins can manage profiles" on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "authenticated users can read centers" on public.centers
  for select to authenticated
  using (true);

create policy "admins can manage centers" on public.centers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "authenticated users can read drivers" on public.drivers
  for select to authenticated
  using (true);

create policy "admins can manage drivers" on public.drivers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "authenticated users can read vehicles" on public.vehicles
  for select to authenticated
  using (true);

create policy "admins can manage vehicles" on public.vehicles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "authenticated users can read uploaded files" on public.uploaded_files
  for select to authenticated
  using (true);

create policy "users can create uploaded files" on public.uploaded_files
  for insert to authenticated
  with check (uploaded_by = auth.uid() or public.is_admin());

create policy "owners or admins can update uploaded files" on public.uploaded_files
  for update to authenticated
  using (uploaded_by = auth.uid() or public.is_admin())
  with check (uploaded_by = auth.uid() or public.is_admin());

create policy "admins can delete uploaded files" on public.uploaded_files
  for delete to authenticated
  using (public.is_admin());

create policy "authenticated users can read settlement batches" on public.settlement_batches
  for select to authenticated
  using (true);

create policy "users can create settlement batches" on public.settlement_batches
  for insert to authenticated
  with check (uploaded_by = auth.uid() or public.is_admin());

create policy "owners or admins can update settlement batches" on public.settlement_batches
  for update to authenticated
  using (uploaded_by = auth.uid() or public.is_admin())
  with check (uploaded_by = auth.uid() or public.is_admin());

create policy "admins can delete settlement batches" on public.settlement_batches
  for delete to authenticated
  using (public.is_admin());

create policy "authenticated users can read settlement rows" on public.settlement_rows
  for select to authenticated
  using (true);

create policy "batch owners or admins can create settlement rows" on public.settlement_rows
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.settlement_batches b
      where b.id = batch_id and b.uploaded_by = auth.uid()
    )
  );

create policy "batch owners or admins can update settlement rows" on public.settlement_rows
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.settlement_batches b
      where b.id = batch_id and b.uploaded_by = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.settlement_batches b
      where b.id = batch_id and b.uploaded_by = auth.uid()
    )
  );

create policy "admins can delete settlement rows" on public.settlement_rows
  for delete to authenticated
  using (public.is_admin());

create policy "authenticated users can read comparison results" on public.comparison_results
  for select to authenticated
  using (true);

create policy "users can create comparison results" on public.comparison_results
  for insert to authenticated
  with check (compared_by = auth.uid() or public.is_admin());

create policy "owners or admins can update comparison results" on public.comparison_results
  for update to authenticated
  using (compared_by = auth.uid() or public.is_admin())
  with check (compared_by = auth.uid() or public.is_admin());

create policy "admins can delete comparison results" on public.comparison_results
  for delete to authenticated
  using (public.is_admin());
