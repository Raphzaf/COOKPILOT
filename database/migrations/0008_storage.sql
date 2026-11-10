-- CookPilot · 0008 · Storage buckets
--
--   recipe-images   public read, admin write   (recipe cover photography you own the rights to)
--   device-images   public read, admin write   (your own appliance photos — never manufacturer images)
--   knowledge-docs  private, admin only        (source documents kept for audit)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('recipe-images', 'recipe-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('device-images', 'device-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('knowledge-docs', 'knowledge-docs', false, 20971520, array['application/pdf', 'text/plain', 'text/markdown'])
on conflict (id) do nothing;

create policy "public images: read" on storage.objects for select to anon, authenticated
  using (bucket_id in ('recipe-images', 'device-images'));

create policy "catalogue buckets: admin insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('recipe-images', 'device-images', 'knowledge-docs') and public.is_admin());
create policy "catalogue buckets: admin update" on storage.objects for update to authenticated
  using (bucket_id in ('recipe-images', 'device-images', 'knowledge-docs') and public.is_admin())
  with check (bucket_id in ('recipe-images', 'device-images', 'knowledge-docs') and public.is_admin());
create policy "catalogue buckets: admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('recipe-images', 'device-images', 'knowledge-docs') and public.is_admin());
create policy "knowledge docs: admin read" on storage.objects for select to authenticated
  using (bucket_id = 'knowledge-docs' and public.is_admin());
