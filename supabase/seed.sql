-- Initial non-auth seed data. Do not insert directly into auth.users.

insert into public.centers (name)
values
  ('안산'),
  ('평택'),
  ('양산'),
  ('김해')
on conflict (name) do update
set updated_at = now(), is_active = true;
