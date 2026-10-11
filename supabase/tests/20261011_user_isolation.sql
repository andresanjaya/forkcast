-- Run against a disposable local Supabase database after the migration.
-- This transaction rolls back its users and data. It checks direct SQL access under
-- the authenticated API role, including attempts to attach an item to another meal.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'porsi-a@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'porsi-b@example.invalid');

insert into public.profiles (user_id, age, height_cm, weight_kg, formula_sex, activity, goal, calorie_target) values
  ('11111111-1111-4111-8111-111111111111', 30, 170, 70, 'pria', 'ringan', 'jaga', 2100),
  ('22222222-2222-4222-8222-222222222222', 28, 160, 60, 'wanita', 'ringan', 'jaga', 1800);
insert into public.meals (id, user_id, eaten_at, local_date, meal_type, title, entry_method) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', now(), current_date, 'Sarapan', 'Meal A', 'manual'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', now(), current_date, 'Sarapan', 'Meal B', 'manual');
insert into public.meal_items (id, meal_id, user_id, name_snapshot, quantity, unit, grams_per_unit, grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source_label) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Nasi A', 1, 'porsi', 100, 100, 130, 2, 28, 0, 'test'),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Nasi B', 1, 'porsi', 100, 100, 130, 2, 28, 0, 'test');
insert into public.calorie_target_history (id, user_id, calories, source) values
  ('aaaaaaaa-1000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 2100, 'manual'),
  ('bbbbbbbb-1000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 1800, 'manual');
insert into public.weight_entries (id, user_id, entry_date, weight_kg) values
  ('aaaaaaaa-2000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', current_date, 70),
  ('bbbbbbbb-2000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', current_date, 60);
insert into public.saved_meals (id, user_id, title, items) values
  ('aaaaaaaa-3000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Saved A', '[]'::jsonb),
  ('bbbbbbbb-3000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Saved B', '[]'::jsonb);
insert into public.food_corrections (id, user_id, candidate_text, candidate_key, selected_name, quantity, unit, grams, item_snapshot) values
  ('aaaaaaaa-4000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Ayam', 'ayam', 'Ayam bakar', 1, 'potong', 100, '{}'::jsonb),
  ('bbbbbbbb-4000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Ayam', 'ayam', 'Ayam goreng', 1, 'potong', 100, '{}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select is((select count(*)::integer from public.profiles), 1, 'A sees only own profile');
select is((select count(*)::integer from public.meals), 1, 'A sees only own meal');
select is((select count(*)::integer from public.meal_items), 1, 'A sees only own meal item');
select is((select count(*)::integer from public.meals where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 0, 'A cannot read B meal by id');
select throws_ok($$insert into public.profiles (user_id, age, height_cm, weight_kg, formula_sex, activity, goal, calorie_target)
  values ('22222222-2222-4222-8222-222222222222', 30, 170, 70, 'pria', 'ringan', 'jaga', 2100)$$, '42501', null, 'A cannot insert B profile');
select throws_ok($$insert into public.meals (user_id, eaten_at, local_date, meal_type, title, entry_method)
  values ('22222222-2222-4222-8222-222222222222', now(), current_date, 'Sarapan', 'Intrusion', 'manual')$$, '42501', null, 'A cannot insert B meal');
select throws_ok($$insert into public.meal_items (meal_id, user_id, name_snapshot, quantity, unit, grams_per_unit, grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source_label)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Intrusion', 1, 'porsi', 100, 100, 130, 2, 28, 0, 'test')$$, '42501', null, 'A cannot insert B item');
select throws_ok($$insert into public.meal_items (meal_id, user_id, name_snapshot, quantity, unit, grams_per_unit, grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source_label)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'Intrusion', 1, 'porsi', 100, 100, 130, 2, 28, 0, 'test')$$, '23503', null, 'A cannot attach own item to B meal');

select is((select count(*)::integer from public.calorie_target_history), 1, 'A sees only own target history');
select is((select count(*)::integer from public.weight_entries), 1, 'A sees only own weight history');
select is((select count(*)::integer from public.calorie_target_history where id = 'bbbbbbbb-1000-4000-8000-000000000001'), 0, 'A cannot read B target by id');
select is((select count(*)::integer from public.weight_entries where id = 'bbbbbbbb-2000-4000-8000-000000000001'), 0, 'A cannot read B weight by id');
select throws_ok($$insert into public.calorie_target_history(user_id, calories, source)
  values ('22222222-2222-4222-8222-222222222222', 2000, 'manual')$$, '42501', null, 'A cannot insert B target');
select throws_ok($$insert into public.weight_entries(user_id, entry_date, weight_kg)
  values ('22222222-2222-4222-8222-222222222222', current_date - 1, 60)$$, '42501', null, 'A cannot insert B weight');
select lives_ok($$select public.save_profile_with_weight('A', 30, 170, 68, 'pria', 'ringan', 'jaga', 2100, current_date, true)$$, 'A can update current weight atomically');
select is((select count(*)::integer from public.weight_entries where entry_date = current_date and superseded_at is null), 1, 'same-day weight update keeps one current row');

select is((select count(*)::integer from public.saved_meals), 1, 'A sees only own saved meals');
select is((select count(*)::integer from public.food_corrections), 1, 'A sees only own corrections');
select is((select count(*)::integer from public.saved_meals where id = 'bbbbbbbb-3000-4000-8000-000000000001'), 0, 'A cannot read B saved meal');
select is((select count(*)::integer from public.food_corrections where id = 'bbbbbbbb-4000-4000-8000-000000000001'), 0, 'A cannot read B correction');
select throws_ok($$insert into public.saved_meals(user_id, title, items)
  values ('22222222-2222-4222-8222-222222222222', 'Intrusion', '[]'::jsonb)$$, '42501', null, 'A cannot insert B saved meal');
select throws_ok($$insert into public.food_corrections(user_id, candidate_text, candidate_key, selected_name, quantity, unit, grams, item_snapshot)
  values ('22222222-2222-4222-8222-222222222222', 'Ayam', 'ayam', 'Intrusion', 1, 'potong', 100, '{}'::jsonb)$$, '42501', null, 'A cannot insert B correction');
select is((with changed as (update public.saved_meals set title = 'Intrusion' where id = 'bbbbbbbb-3000-4000-8000-000000000001' returning id) select count(*)::integer from changed), 0, 'A cannot update B saved meal');
select is((with changed as (update public.food_corrections set selected_name = 'Intrusion' where id = 'bbbbbbbb-4000-4000-8000-000000000001' returning id) select count(*)::integer from changed), 0, 'A cannot update B correction');
select is((with changed as (delete from public.saved_meals where id = 'bbbbbbbb-3000-4000-8000-000000000001' returning id) select count(*)::integer from changed), 0, 'A cannot delete B saved meal');
select is((with changed as (delete from public.food_corrections where id = 'bbbbbbbb-4000-4000-8000-000000000001' returning id) select count(*)::integer from changed), 0, 'A cannot delete B correction');

select * from finish();
rollback;
