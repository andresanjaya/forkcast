-- Porsi MVP. Apply once in the Supabase SQL Editor or with Supabase CLI migrations.
-- Public food samples remain in the app; private data is always owned by auth.uid().

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  locale text not null default 'id-ID',
  age integer not null check (age between 18 and 120),
  height_cm numeric(5,1) not null check (height_cm between 100 and 250),
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 400),
  formula_sex text not null check (formula_sex in ('pria', 'wanita')),
  activity text not null check (activity in ('rendah', 'ringan', 'sedang', 'tinggi')),
  goal text not null check (goal in ('turun', 'jaga', 'naik')),
  calorie_target integer not null check (calorie_target between 1000 and 6000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  eaten_at timestamptz not null,
  local_date date not null,
  meal_type text not null check (meal_type in ('Sarapan', 'Makan siang', 'Makan malam', 'Camilan')),
  title text not null check (char_length(title) between 1 and 160),
  entry_method text not null check (entry_method in ('manual', 'foto', 'tersimpan')),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index meals_user_date_idx on public.meals(user_id, local_date desc, eaten_at desc);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_id text,
  name_snapshot text not null check (char_length(name_snapshot) between 1 and 160),
  quantity numeric(9,2) not null check (quantity > 0 and quantity <= 10000),
  unit text not null check (char_length(unit) between 1 and 40),
  grams_per_unit numeric(9,2) not null check (grams_per_unit > 0),
  grams numeric(9,2) not null check (grams > 0 and grams <= 10000),
  calories_per_100g numeric(9,2) not null check (calories_per_100g >= 0),
  protein_per_100g numeric(9,2) not null check (protein_per_100g >= 0),
  carbs_per_100g numeric(9,2) not null check (carbs_per_100g >= 0),
  fat_per_100g numeric(9,2) not null check (fat_per_100g >= 0),
  source_label text not null,
  user_corrected boolean not null default false,
  position integer not null default 0,
  foreign key (meal_id, user_id) references public.meals(id, user_id) on delete cascade
);
create index meal_items_meal_idx on public.meal_items(meal_id, position);
create index meal_items_user_idx on public.meal_items(user_id);

create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  created_at timestamptz not null default now()
);
create index saved_meals_user_created_idx on public.saved_meals(user_id, created_at desc);

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now()
);
create index weight_entries_user_date_idx on public.weight_entries(user_id, entry_date desc);

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.saved_meals enable row level security;
alter table public.weight_entries enable row level security;

revoke all on public.profiles, public.meals, public.meal_items, public.saved_meals, public.weight_entries from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.meals, public.meal_items, public.saved_meals, public.weight_entries to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy profiles_delete_own on public.profiles for delete to authenticated using (user_id = (select auth.uid()));

create policy meals_select_own on public.meals for select to authenticated using (user_id = (select auth.uid()));
create policy meals_insert_own on public.meals for insert to authenticated with check (user_id = (select auth.uid()));
create policy meals_update_own on public.meals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy meals_delete_own on public.meals for delete to authenticated using (user_id = (select auth.uid()));

-- The composite foreign key additionally forbids attaching an owned item to another user's meal.
create policy meal_items_select_own on public.meal_items for select to authenticated using (user_id = (select auth.uid()));
create policy meal_items_insert_own on public.meal_items for insert to authenticated with check (user_id = (select auth.uid()));
create policy meal_items_update_own on public.meal_items for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy meal_items_delete_own on public.meal_items for delete to authenticated using (user_id = (select auth.uid()));

create policy saved_meals_select_own on public.saved_meals for select to authenticated using (user_id = (select auth.uid()));
create policy saved_meals_insert_own on public.saved_meals for insert to authenticated with check (user_id = (select auth.uid()));
create policy saved_meals_update_own on public.saved_meals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saved_meals_delete_own on public.saved_meals for delete to authenticated using (user_id = (select auth.uid()));

create policy weight_entries_select_own on public.weight_entries for select to authenticated using (user_id = (select auth.uid()));
create policy weight_entries_insert_own on public.weight_entries for insert to authenticated with check (user_id = (select auth.uid()));
create policy weight_entries_update_own on public.weight_entries for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy weight_entries_delete_own on public.weight_entries for delete to authenticated using (user_id = (select auth.uid()));
