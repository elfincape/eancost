-- Storage extensions for stage 8 persistence.
-- Adds transformed settlement data storage used after browser-side conversion.

create table if not exists public.converted_settlement_rows (
  id uuid primary key default gen_random_uuid(),
  source_batch_id uuid references public.settlement_batches(id) on delete set null,
  center_id uuid references public.centers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  settlement_month date,
  vehicle_number text not null,
  driver_name text,
  center_name text,
  operation_date date,
  billing_amount numeric(14, 2) not null default 0,
  payment_amount numeric(14, 2) not null default 0,
  memo text,
  converted_data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists converted_settlement_rows_vehicle_number_idx on public.converted_settlement_rows(vehicle_number);
create index if not exists converted_settlement_rows_center_month_idx on public.converted_settlement_rows(center_id, settlement_month);
create index if not exists converted_settlement_rows_source_batch_idx on public.converted_settlement_rows(source_batch_id);

drop trigger if exists set_converted_settlement_rows_updated_at on public.converted_settlement_rows;
create trigger set_converted_settlement_rows_updated_at
before update on public.converted_settlement_rows
for each row execute function public.set_updated_at();

alter table public.converted_settlement_rows enable row level security;

create policy "authenticated users can read converted settlement rows" on public.converted_settlement_rows
  for select to authenticated
  using (true);

create policy "users can create converted settlement rows" on public.converted_settlement_rows
  for insert to authenticated
  with check (created_by = auth.uid() or public.is_admin());

create policy "owners or admins can update converted settlement rows" on public.converted_settlement_rows
  for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy "admins can delete converted settlement rows" on public.converted_settlement_rows
  for delete to authenticated
  using (public.is_admin());
