-- Adds separate macro goals while preserving old calorie history rows.
alter table public.calorie_target_history
  add column if not exists protein_target integer check (protein_target between 0 and 1000),
  add column if not exists carbs_target integer check (carbs_target between 0 and 1000),
  add column if not exists fat_target integer check (fat_target between 0 and 1000);

create or replace function public.save_nutrition_target(
  p_id uuid, p_calories integer, p_protein integer, p_carbs integer, p_fat integer,
  p_source text, p_formula_version text, p_inputs jsonb,
  p_effective_at timestamptz, p_note text
) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if not exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'Save profile first';
  end if;
  insert into public.calorie_target_history
    (id, user_id, calories, protein_target, carbs_target, fat_target, source, formula_version, inputs, effective_at, note)
  values
    (p_id, auth.uid(), p_calories, p_protein, p_carbs, p_fat, p_source, p_formula_version, p_inputs, p_effective_at, p_note)
  on conflict (id) do nothing;
  if not exists (
    select 1 from public.calorie_target_history
    where id = p_id and user_id = auth.uid() and calories = p_calories
      and protein_target = p_protein and carbs_target = p_carbs and fat_target = p_fat
      and source = p_source and formula_version is not distinct from p_formula_version
      and inputs is not distinct from p_inputs and effective_at = p_effective_at and note = p_note
  ) then raise exception 'Target id unavailable or already used for different values'; end if;
  update public.profiles set calorie_target = p_calories, updated_at = now() where user_id = auth.uid();
end;
$$;
revoke all on function public.save_nutrition_target(uuid, integer, integer, integer, integer, text, text, jsonb, timestamptz, text) from public, anon;
grant execute on function public.save_nutrition_target(uuid, integer, integer, integer, integer, text, text, jsonb, timestamptz, text) to authenticated;
