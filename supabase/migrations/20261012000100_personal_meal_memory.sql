-- Apply after 20261011000200_accounts_targets.sql.
-- Saved meals already store their item snapshots as JSONB; keep that model.
alter table public.saved_meals
  add column note text not null default '' check (char_length(note) <= 300),
  add column category text check (category in ('Sarapan', 'Makan siang', 'Makan malam', 'Camilan')),
  add column updated_at timestamptz not null default now();
create index saved_meals_user_updated_idx on public.saved_meals(user_id, updated_at desc);

create table public.food_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  candidate_text text not null check (char_length(candidate_text) between 1 and 100),
  candidate_key text not null check (char_length(candidate_key) between 1 and 100),
  selected_food_id text,
  selected_name text not null check (char_length(selected_name) between 1 and 160),
  selected_alias text not null default '' check (char_length(selected_alias) <= 100),
  quantity numeric(9,2) not null check (quantity > 0 and quantity <= 10000),
  unit text not null check (char_length(unit) between 1 and 40),
  grams numeric(9,2) not null check (grams > 0 and grams <= 10000),
  item_snapshot jsonb not null check (jsonb_typeof(item_snapshot) = 'object'),
  created_at timestamptz not null default now()
);
create index food_corrections_user_candidate_idx on public.food_corrections(user_id, candidate_key, created_at desc);
create index food_corrections_user_created_idx on public.food_corrections(user_id, created_at desc);

alter table public.food_corrections enable row level security;
revoke all on public.food_corrections from anon, authenticated;
grant select, insert, update, delete on public.food_corrections to authenticated;
create policy food_corrections_select_own on public.food_corrections for select to authenticated using (user_id = (select auth.uid()));
create policy food_corrections_insert_own on public.food_corrections for insert to authenticated with check (user_id = (select auth.uid()));
create policy food_corrections_update_own on public.food_corrections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy food_corrections_delete_own on public.food_corrections for delete to authenticated using (user_id = (select auth.uid()));
