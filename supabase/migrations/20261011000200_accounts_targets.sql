-- Apply after 20261011000100_food_tracker.sql.
-- Existing profile targets are preserved as the first history entry.
alter table public.profiles drop constraint if exists profiles_formula_sex_check;
alter table public.profiles add constraint profiles_formula_sex_check
  check (formula_sex in ('pria', 'wanita', 'tidak_menyebutkan'));

create table public.calorie_target_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories integer not null check (calories between 1000 and 6000),
  source text not null check (source in ('calculated', 'manual')),
  formula_version text,
  inputs jsonb,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  note text not null default '' check (char_length(note) <= 300),
  check ((source = 'manual' and formula_version is null and inputs is null)
    or (source = 'calculated' and formula_version is not null and jsonb_typeof(inputs) = 'object'))
);
create index calorie_target_history_user_effective_idx
  on public.calorie_target_history(user_id, effective_at desc, created_at desc);

alter table public.calorie_target_history enable row level security;
revoke all on public.calorie_target_history from anon, authenticated;
grant select, insert, delete on public.calorie_target_history to authenticated;
create policy calorie_target_history_select_own on public.calorie_target_history for select to authenticated using (user_id = (select auth.uid()));
create policy calorie_target_history_insert_own on public.calorie_target_history for insert to authenticated with check (user_id = (select auth.uid()));
create policy calorie_target_history_delete_own on public.calorie_target_history for delete to authenticated using (user_id = (select auth.uid()));

insert into public.calorie_target_history(user_id, calories, source, effective_at, created_at, note)
select user_id, calorie_target, 'manual', updated_at, updated_at, 'Target sebelum fitur riwayat'
from public.profiles;

-- Keep duplicate legacy measurements for audit, but allow only one current entry per date.
alter table public.weight_entries add column superseded_at timestamptz;
with ranked as (
  select id, row_number() over (partition by user_id, entry_date order by created_at desc, id desc) as position
  from public.weight_entries
)
update public.weight_entries as entry set superseded_at = now()
from ranked where ranked.id = entry.id and ranked.position > 1;
create unique index weight_entries_one_current_per_day_idx
  on public.weight_entries(user_id, entry_date) where superseded_at is null;

-- SECURITY INVOKER keeps table RLS active. A single RPC saves profile and today's weight atomically.
create function public.save_profile_with_weight(
  p_display_name text, p_age integer, p_height_cm numeric, p_weight_kg numeric,
  p_formula_sex text, p_activity text, p_goal text, p_calorie_target integer,
  p_local_date date, p_record_weight boolean default false
) returns void language plpgsql security invoker set search_path = '' as $$
declare prior_weight numeric;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select weight_kg into prior_weight from public.profiles where user_id = auth.uid();
  insert into public.profiles(user_id, display_name, locale, age, height_cm, weight_kg, formula_sex, activity, goal, calorie_target)
  values (auth.uid(), p_display_name, 'id-ID', p_age, p_height_cm, p_weight_kg, p_formula_sex, p_activity, p_goal, p_calorie_target)
  on conflict (user_id) do update set display_name = excluded.display_name, age = excluded.age,
    height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, formula_sex = excluded.formula_sex,
    activity = excluded.activity, goal = excluded.goal, updated_at = now();
  if p_record_weight or prior_weight is distinct from p_weight_kg then
    insert into public.weight_entries(user_id, entry_date, weight_kg)
    values (auth.uid(), p_local_date, p_weight_kg)
    on conflict (user_id, entry_date) where superseded_at is null
    do update set weight_kg = excluded.weight_kg, created_at = now();
  end if;
end;
$$;
revoke all on function public.save_profile_with_weight(text, integer, numeric, numeric, text, text, text, integer, date, boolean) from public, anon;
grant execute on function public.save_profile_with_weight(text, integer, numeric, numeric, text, text, text, integer, date, boolean) to authenticated;

create function public.save_calorie_target(
  p_id uuid, p_calories integer, p_source text, p_formula_version text,
  p_inputs jsonb, p_effective_at timestamptz, p_note text
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'Save profile first';
  end if;
  insert into public.calorie_target_history(id, user_id, calories, source, formula_version, inputs, effective_at, note)
  values (p_id, auth.uid(), p_calories, p_source, p_formula_version, p_inputs, p_effective_at, p_note)
  on conflict (id) do nothing;
  if not exists (select 1 from public.calorie_target_history where id = p_id and user_id = auth.uid()) then
    raise exception 'Target id unavailable';
  end if;
  if not exists (
    select 1 from public.calorie_target_history
    where id = p_id and user_id = auth.uid() and calories = p_calories and source = p_source
      and formula_version is not distinct from p_formula_version
      and inputs is not distinct from p_inputs and effective_at = p_effective_at
      and note = p_note
  ) then raise exception 'Target id already used for different values'; end if;
  update public.profiles set calorie_target = p_calories, updated_at = now() where user_id = auth.uid();
end;
$$;
revoke all on function public.save_calorie_target(uuid, integer, text, text, jsonb, timestamptz, text) from public, anon;
grant execute on function public.save_calorie_target(uuid, integer, text, text, jsonb, timestamptz, text) to authenticated;

create function public.remove_weight_entry(p_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare latest_weight numeric;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  delete from public.weight_entries where id = p_id and user_id = auth.uid();
  select weight_kg into latest_weight from public.weight_entries
  where user_id = auth.uid() and superseded_at is null
  order by entry_date desc, created_at desc limit 1;
  if latest_weight is not null then
    update public.profiles set weight_kg = latest_weight, updated_at = now() where user_id = auth.uid();
  end if;
end;
$$;
revoke all on function public.remove_weight_entry(uuid) from public, anon;
grant execute on function public.remove_weight_entry(uuid) to authenticated;
