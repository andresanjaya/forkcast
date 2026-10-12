-- Apply after 20261012000100_personal_meal_memory.sql.
-- Existing foods retain their per-100-g values. Packaged entries keep their
-- original nutrition basis and nullable values in product_snapshot; the old
-- numeric columns are NULL for them. For packaged rows, legacy grams and
-- grams_per_unit hold the numeric measure in product_snapshot.basis.unit.
alter table public.meal_items
  alter column calories_per_100g drop not null,
  alter column protein_per_100g drop not null,
  alter column carbs_per_100g drop not null,
  alter column fat_per_100g drop not null,
  add column product_snapshot jsonb check (product_snapshot is null or jsonb_typeof(product_snapshot) = 'object');

create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barcode text check (barcode is null or barcode ~ '^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$'),
  product_snapshot jsonb not null check (jsonb_typeof(product_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, barcode)
);
create index user_products_owner_updated_idx on public.user_products(user_id, updated_at desc);
alter table public.user_products enable row level security;
revoke all on public.user_products from anon, authenticated;
grant select, insert, update, delete on public.user_products to authenticated;
create policy user_products_select_own on public.user_products for select to authenticated using (user_id = (select auth.uid()));
create policy user_products_insert_own on public.user_products for insert to authenticated with check (user_id = (select auth.uid()));
create policy user_products_update_own on public.user_products for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_products_delete_own on public.user_products for delete to authenticated using (user_id = (select auth.uid()));
