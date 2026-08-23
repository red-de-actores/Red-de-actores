# Red de Actores V0.7.1

Corrección de V0.7: crea/repara el bucket `casting-images`, asegura las columnas de Castings (incluida `submitted_at`), mejora la compatibilidad del listado y corrige el contraste de mensajes de error.

**Si venías de V0.7 y viste “Bucket not found” o “column castings.submitted_at does not exist”, ejecutá solamente `supabase-v0.7.1-repair.sql`.**

# Red de Actores — Córdoba Casting V0.7

Versión funcional sobre Supabase con perfiles actorales, moderación, notificaciones y cartelera pública de castings.

## Antes de subir esta versión

Tu proyecto ya tiene ejecutadas las migraciones anteriores. Para V0.7 ejecutá **una sola vez**:

`supabase-v0.7-migration.sql`

Ruta: Supabase → SQL Editor → New query → pegar el archivo completo → Run.

No vuelvas a ejecutar `supabase-setup.sql`, `supabase-v0.5-migration.sql` ni `supabase-v0.6-migration.sql` si ya fueron ejecutados.

## Cambios principales de V0.7

### Notificaciones

- La campanita ahora muestra solamente notificaciones no leídas.
- Hacer clic en una notificación la marca como leída y deja de aparecer.
- Las notificaciones de aprobación/rechazo/cambios llevan a `Mi perfil`.
- Se agregó `Marcar todo como leído`, que vacía la bandeja de pendientes.
- El contador se actualiza al leer notificaciones.

### Castings: nuevo funcionamiento

Castings funciona como **cartelera pública**, sin conexión con los perfiles actorales.

- Cualquier persona puede enviar un casting sin crear una cuenta.
- El casting queda `Pendiente` y NO se publica hasta que un administrador lo aprueba.
- El formulario solicita:
  - nombre del proyecto;
  - uno o varios roles;
  - género masculino/femenino por rol;
  - edad o rango de edad por rol;
  - requisitos excluyentes opcionales;
  - remunerado sí/no;
  - duración inicial de 3, 5, 7 o 10 días;
  - dato de contacto público: email, WhatsApp o teléfono;
  - imagen obligatoria del anuncio.
- No existe `Postularme con mi perfil` ni tabla de postulaciones.
- Cada actor se comunica directamente con el contacto publicado y decide qué material enviar.

### Administración de castings

En Administración → Castings aparecen:

- Pendientes: descargar imagen, aprobar, rechazar o eliminar.
- Publicados: descargar imagen, extender fecha, finalizar o eliminar.
- Finalizados/rechazados: descargar, reabrir/extender o eliminar.
- El admin puede extender la fecha más allá de los 10 días iniciales.

### Imágenes de castings

- Se creó el bucket `casting-images`.
- Las imágenes se comprimen a WEBP antes de subir.
- Tamaño máximo de archivo de origen: 5 MB.
- El administrador puede descargar la imagen original procesada desde Administración para usarla en Instagram u otros canales.
- Al eliminar definitivamente un casting desde Administración, la web elimina primero la imagen de Storage y después el registro del casting.

## Seguridad / moderación

- Un envío público no puede autoaprobarse.
- El público solo puede leer castings aprobados, abiertos y todavía vigentes.
- La aprobación, rechazo, extensión y eliminación siguen reservados al admin.
- La carga pública de imágenes queda restringida al bucket `casting-images`, carpeta `submissions`, con tipos JPEG/PNG/WEBP y límite de 5 MB.

## Flujo de prueba recomendado

1. Ejecutar `supabase-v0.7-migration.sql` y confirmar `Success`.
2. Subir V0.7 a GitHub Pages.
3. Abrir Castings sin iniciar sesión y enviar un casting de prueba.
4. Entrar como admin → Administración → Castings.
5. Confirmar que el anuncio aparece en Pendientes y que la imagen se puede descargar.
6. Aprobarlo.
7. Abrir Castings en incógnito y comprobar que ahora aparece públicamente con contacto directo.
8. Probar extender/finalizar/eliminar y confirmar que al eliminar también desaparece la imagen.
9. Probar la campanita: hacer clic en una notificación y luego `Marcar todo como leído`.

## Nota

La V0.7 mantiene el resto del sistema de perfiles de V0.6: registro, aprobación inicial, edición libre posterior, solicitar cambios, destacados, ocultar/mostrar, renovación anual, fotos y videos.
