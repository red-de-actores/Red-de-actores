# Red de Actores — Córdoba Casting V0.3

Primera versión conectable a Supabase. Mantiene el frontend V0.2 y agrega cuentas reales, perfiles autogestionados y moderación de administrador.

## Qué hace esta versión

- Cada actor crea su propia cuenta con email + contraseña.
- El actor completa y envía su propio perfil: Córdoba Casting no tiene que darle el alta manualmente.
- Foto principal obligatoria con una aclaración visible: alcanza con una foto clara donde se vea bien el rostro.
- Hasta 2 fotos adicionales opcionales.
- Las imágenes se redimensionan en el navegador a un máximo aproximado de 1200 px y se convierten a WEBP antes de subirlas.
- Fecha de nacimiento privada; el directorio público recibe solamente la edad calculada.
- Máximo 7 habilidades.
- Video de presentación obligatorio mediante YouTube/Vimeo; reel y monólogo/escena opcionales.
- Disponibilidad y aceptación de trabajos estudiantiles/no remunerados.
- Alta nueva: draft/rejected → pending → approved/rejected.
- Una vez aprobado, el actor puede modificar libremente sus datos sin volver a revisión.
- Perfil rechazado: muestra claramente el motivo y al guardar vuelve automáticamente a `pending`.
- Panel Administración real, accesible solo con `role = admin`.
- Admin: revisar pendientes, aprobar, rechazar con motivo, ocultar/mostrar y destacar perfiles.
- Perfiles aprobados y visibles alimentan automáticamente el directorio público.
- La fecha de nacimiento NO sale de las RPC públicas.
- La disponibilidad pública vence automáticamente cuando pasan 12 meses sin confirmar actividad.
- Notificaciones de aprobación/rechazo quedan creadas en base de datos (la campanita visual se conecta en una próxima tanda).

## Activación de Supabase

1. Crear un proyecto NUEVO de Supabase exclusivo para Red de Actores.
2. Abrir `supabase-setup.sql`, copiar todo y ejecutarlo en Supabase > SQL Editor.
3. En Supabase > Authentication > Providers > Email, desactivar la confirmación obligatoria de email para mantener el flujo acordado.
4. Ir a Project Settings > API y copiar:
   - Project URL
   - anon/public key
5. Abrir `js/config.js` y reemplazar:
   - `PEGAR_SUPABASE_URL`
   - `PEGAR_SUPABASE_ANON_KEY`
6. Crear tu propia cuenta desde `registro.html`.
7. Ejecutar una sola vez en SQL Editor, reemplazando el email:

```sql
update public.profiles
set role='admin'
where id=(select id from auth.users where email='TU_EMAIL_ADMIN');
```

8. Cerrá sesión y volvé a entrar. En la navegación aparecerá `Administración` solamente para esa cuenta.

## Seguridad

El frontend no puede decidir quién es admin. Las políticas RLS y triggers de Supabase bloquean que un actor pueda aprobarse, hacerse admin, destacarse, verificarse u ocultarse a sí mismo.

Los visitantes públicos no tienen `SELECT` directo sobre la tabla `profiles`. El directorio usa funciones RPC que devuelven solamente los campos públicos y calculan la edad sin revelar `birth_date`.

## Demo sin Supabase

Mientras `js/config.js` mantenga los placeholders, la home y perfiles públicos siguen usando los actores ficticios de `js/data.js`, por lo que el diseño puede seguir revisándose antes de conectar la base real.
