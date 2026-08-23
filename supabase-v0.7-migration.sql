-- RED DE ACTORES — V0.7
-- Ejecutar UNA VEZ después de supabase-v0.6-migration.sql
-- Cambios: cartelera pública de castings sin postulaciones internas + imágenes + moderación.

-- 1) Castings dejan de estar vinculados a perfiles actorales.
drop table if exists public.casting_applications cascade;

-- 2) Ampliar la tabla existente sin perder castings de pruebas previas.
alter table public.castings alter column description drop not null;
alter table public.castings add column if not exists status text not null default 'pending';
alter table public.castings add column if not exists roles jsonb not null default '[]'::jsonb;
alter table public.castings add column if not exists requirements text;
alter table public.castings add column if not exists contact_type text;
alter table public.castings add column if not exists contact_value text;
alter table public.castings add column if not exists image_path text;
alter table public.castings add column if not exists image_url text;
alter table public.castings add column if not exists duration_days integer not null default 10;
alter table public.castings add column if not exists submitted_at timestamptz not null default now();
alter table public.castings add column if not exists published_at timestamptz;
alter table public.castings add column if not exists expires_at timestamptz;
alter table public.castings add column if not exists rejection_reason text;

alter table public.castings drop constraint if exists castings_status_check;
alter table public.castings add constraint castings_status_check
  check (status in ('pending','approved','rejected','closed'));
alter table public.castings drop constraint if exists castings_duration_days_check;
alter table public.castings add constraint castings_duration_days_check
  check (duration_days between 1 and 10);
alter table public.castings drop constraint if exists castings_contact_type_check;
alter table public.castings add constraint castings_contact_type_check
  check (contact_type is null or contact_type in ('email','phone','whatsapp'));

-- Los castings creados en V0.6 eran de admin y se consideran aprobados para no romper datos de prueba.
update public.castings
set status='approved',
    published_at=coalesce(published_at,created_at),
    expires_at=coalesce(expires_at, case when deadline is not null then deadline::timestamptz + interval '1 day' else created_at + interval '10 days' end)
where status='pending' and created_by is not null;

-- 3) RLS: el público solo ve anuncios aprobados, abiertos y vigentes. El admin ve todo.
drop policy if exists "public reads open castings" on public.castings;
drop policy if exists "admin manages castings" on public.castings;
create policy "public reads approved active castings" on public.castings
for select using (
  public.is_admin()
  or (status='approved' and is_open=true and expires_at is not null and expires_at > now())
);
create policy "admin manages castings" on public.castings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.castings to anon, authenticated;
grant insert, update, delete on public.castings to authenticated;

-- 4) Bucket exclusivo para flyers/imágenes de castings.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('casting-images','casting-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=true,
  file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

-- Cualquiera puede enviar una imagen, pero no listar/modificar/borrar archivos ajenos.
drop policy if exists "public uploads casting images" on storage.objects;
create policy "public uploads casting images" on storage.objects
for insert to anon, authenticated
with check (bucket_id='casting-images' and (storage.foldername(name))[1]='submissions');

drop policy if exists "admin manages casting images" on storage.objects;
create policy "admin manages casting images" on storage.objects
for all to authenticated
using (bucket_id='casting-images' and public.is_admin())
with check (bucket_id='casting-images' and public.is_admin());

-- 5) Formulario público. No requiere cuenta.
create or replace function public.submit_public_casting(
  p_project_name text,
  p_roles jsonb,
  p_requirements text,
  p_is_paid boolean,
  p_duration_days integer,
  p_contact_type text,
  p_contact_value text,
  p_image_path text,
  p_image_url text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  new_id uuid;
  clean_days integer;
begin
  if char_length(trim(coalesce(p_project_name,''))) < 2 then
    raise exception 'Ingresá el nombre del proyecto';
  end if;
  if jsonb_typeof(p_roles) <> 'array' or jsonb_array_length(p_roles) < 1 then
    raise exception 'Agregá al menos un rol';
  end if;
  clean_days := greatest(1,least(coalesce(p_duration_days,10),10));
  if p_contact_type not in ('email','phone','whatsapp') then
    raise exception 'Elegí un tipo de contacto válido';
  end if;
  if char_length(trim(coalesce(p_contact_value,''))) < 5 then
    raise exception 'Ingresá un dato de contacto';
  end if;
  if coalesce(p_image_path,'') not like 'submissions/%' or char_length(coalesce(p_image_url,'')) < 10 then
    raise exception 'La imagen del casting es obligatoria';
  end if;

  insert into public.castings(
    title,project_name,roles,requirements,is_paid,duration_days,
    contact_type,contact_value,image_path,image_url,status,is_open,
    submitted_at,created_at,updated_at
  ) values (
    trim(p_project_name),trim(p_project_name),p_roles,nullif(trim(coalesce(p_requirements,'')),''),coalesce(p_is_paid,false),clean_days,
    p_contact_type,trim(p_contact_value),p_image_path,p_image_url,'pending',false,
    now(),now(),now()
  ) returning id into new_id;

  return new_id;
end $$;
grant execute on function public.submit_public_casting(text,jsonb,text,boolean,integer,text,text,text,text) to anon, authenticated;

-- 6) Acciones administrativas encapsuladas.
create or replace function public.admin_approve_casting(target_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Acceso restringido'; end if;
  update public.castings
  set status='approved', is_open=true, rejection_reason=null,
      published_at=now(), expires_at=now() + make_interval(days=>duration_days), updated_at=now()
  where id=target_id;
end $$;
grant execute on function public.admin_approve_casting(uuid) to authenticated;

create or replace function public.admin_reject_casting(target_id uuid, reason text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Acceso restringido'; end if;
  update public.castings
  set status='rejected', is_open=false, rejection_reason=nullif(trim(coalesce(reason,'')),''), updated_at=now()
  where id=target_id;
end $$;
grant execute on function public.admin_reject_casting(uuid,text) to authenticated;

create or replace function public.admin_extend_casting(target_id uuid, new_expiry timestamptz)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() then raise exception 'Acceso restringido'; end if;
  if new_expiry <= now() then raise exception 'La nueva fecha debe ser futura'; end if;
  update public.castings
  set status='approved', is_open=true, expires_at=new_expiry, updated_at=now()
  where id=target_id;
end $$;
grant execute on function public.admin_extend_casting(uuid,timestamptz) to authenticated;
