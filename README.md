# Red de Actores — Córdoba Casting · Frontend V0.1

Primera maqueta funcional navegable. No usa Supabase todavía: los perfiles son datos ficticios y la administración usa localStorage para demostrar destacado/oculto.

## Abrir

Podés abrir `index.html` directamente o servir la carpeta con un servidor estático. Está preparada para GitHub Pages.

## Qué funciona en esta V0.1

- Directorio oscuro y responsive.
- Buscador por nombre, localidad y habilidades.
- Filtros de edad, disponibilidad y aceptación de trabajos estudiantiles.
- Talento destacado administrable en la demo.
- Perfiles individuales con hasta tres fotos.
- Video de presentación prioritario y reproducible en modal.
- Reel y monólogo opcionales.
- Botón de compartir perfil.
- Navegación: Actores, Castings, Formación, Recursos y Quiero mi Reel.
- Perfil privado conceptual con disponibilidad y renovación anual.
- Administración conceptual para destacar/ocultar perfiles.
- Logo real de Córdoba Casting integrado junto a Red de Actores.

## Decisiones cerradas reflejadas

- Sin altura.
- Fecha de nacimiento privada; edad calculada automáticamente.
- Máximo conceptual de 7 habilidades.
- Una foto principal obligatoria + hasta 2 adicionales.
- Presentación obligatoria; reel/monólogo opcionales.
- Disponibilidad manual.
- Aceptación separada de trabajos estudiantiles/no remunerados.
- Renovación anual: al vencer, el perfil pasa a no disponible, no se elimina.
- Talento destacado elegido por admin.
- CTA de Reel discreto, bordó y con imagen de fondo.

## Próxima etapa recomendada

1. Crear proyecto Supabase independiente.
2. Tablas `profiles`, `profile_photos`, `profile_skills`, `notifications`, `castings` y `applications`.
3. Auth + RLS.
4. Storage de hasta 3 fotos por perfil con compresión WEBP.
5. Moderación `draft / pending / approved / rejected`.
6. Función/trigger de renovación anual.
7. Contacto privado.
8. Reemplazar los datos ficticios de `js/data.js` por consultas reales.

## Nota

Las fotos de actores de la demo se cargan desde RandomUser y el video usa un Vimeo de ejemplo. Son placeholders y deben reemplazarse antes de publicar una versión real.
