# Red de Actores — Córdoba Casting V0.5

Primera versión pensada para probar el circuito real de punta a punta con Supabase.

## Antes de subirla

Tu proyecto ya tiene el SQL inicial de V0.3 ejecutado. Por eso, en Supabase > SQL Editor ejecutá **una sola vez** el archivo `supabase-v0.5-migration.sql`. Después podés subir esta carpeta a GitHub Pages.

## Circuito que ya se puede probar

1. Un actor crea su propia cuenta.
2. Completa nombre, fecha de nacimiento privada, localidad, bio, hasta 7 habilidades, disponibilidad y aceptación de trabajos estudiantiles/no remunerados.
3. Sube foto principal obligatoria (solo se exige que el rostro se vea claramente) y hasta dos adicionales.
4. Carga video de presentación obligatorio de YouTube/Vimeo; reel y monólogo/escena son opcionales.
5. El perfil queda pendiente y no es público.
6. El admin lo ve en Administración con fotos y videos embebidos, y puede aprobar o rechazar con motivo.
7. Si se rechaza, el actor ve el motivo; al corregir y guardar vuelve a Pendientes.
8. Si se aprueba, aparece en el directorio y en su perfil público.
9. Una vez aprobado, el actor puede editar libremente sin nueva aprobación.
10. El admin puede ocultar/mostrar, destacar/quitar destacado y eliminar definitivamente una cuenta de actor.
11. La campanita muestra aprobación/rechazo y permite marcar notificaciones como leídas.
12. El perfil muestra vigencia anual. Si vence, deja de figurar como disponible hasta que el actor confirme que sigue activo.
13. Los perfiles públicos tienen un enlace discreto `Reportar perfil`; los reportes aparecen en Administración.

## Importante sobre renovación

La RPC pública ya considera automáticamente `No disponible` a un perfil cuya última confirmación tenga más de un año, aunque el booleano interno todavía esté en `true`. El botón `Confirmar que sigo activo` renueva otros 12 meses.

## Lo que todavía NO está implementado

- Contacto privado productora → actor.
- Publicación y postulación a Castings.
- Formación y Recursos administrables desde Supabase.
- Emails externos; por ahora las notificaciones son internas.

## Seguridad

- La fecha de nacimiento no sale en las RPC públicas; solo se devuelve la edad calculada.
- Un actor no puede hacerse admin, aprobarse, destacarse, verificarse u ocultarse mediante el frontend.
- La pestaña Administración se agrega solo cuando el perfil autenticado tiene `role = admin`.
- El borrado definitivo está encapsulado en una RPC que exige `is_admin()` y bloquea borrar administradores.
