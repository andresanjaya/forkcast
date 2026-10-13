-- Private, compressed meal photos. Existing meals remain valid without a photo.
alter table public.meals add column if not exists photo_path text;
alter table public.meals add column if not exists photo_mime text;
alter table public.meals add column if not exists photo_bytes integer;

alter table public.meals drop constraint if exists meals_photo_metadata_check;
alter table public.meals add constraint meals_photo_metadata_check check (
  (photo_path is null and photo_mime is null and photo_bytes is null)
  or (photo_path is not null and photo_path like user_id::text || '/%' and photo_mime is not null and photo_mime = 'image/jpeg' and photo_bytes is not null and photo_bytes between 1 and 3145728)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 3145728, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'meal_photos_select_own') then
    create policy meal_photos_select_own on storage.objects for select to authenticated
      using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'meal_photos_insert_own') then
    create policy meal_photos_insert_own on storage.objects for insert to authenticated
      with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'meal_photos_delete_own') then
    create policy meal_photos_delete_own on storage.objects for delete to authenticated
      using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'meal_photos_update_own') then
    create policy meal_photos_update_own on storage.objects for update to authenticated
      using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
      with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end $$;
