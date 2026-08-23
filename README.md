# Red de Actores — V0.8

Versión de estabilización y pulido visual sobre la V0.7.4.

## Cambios principales
- Hero de inicio reemplazado por fotografía aportada por Córdoba Casting y optimizada en WEBP.
- Banner “Quiero mi Reel” actualizado con una segunda fotografía aportada por Córdoba Casting.
- Directorio: filtro por texto, edad, disponibilidad y trabajos estudiantiles; orden por actualización reciente o nombre; botón Limpiar; contador de resultados.
- Talento destacado desaparece cuando hay una búsqueda/filtro activo para no interferir con los resultados.
- Castings públicos: ahora la página pública fuerza la visualización únicamente de castings aprobados, abiertos y vigentes incluso si quien navega es administrador.
- Si un administrador entra a Castings se muestra una aclaración de “Vista pública” con acceso directo a Administración.
- Administración: resumen de pendientes, cambios solicitados, castings por revisar y reportes.
- Administración de castings: Publicados, Finalizados y Rechazados aparecen separados; los rechazados muestran “NO PUBLICADO”.
- Mejoras responsive generales para home, filtros, administración y Castings.
- Mantiene las correcciones de responsive del perfil individual y el módulo de Castings reescrito de V0.7.4.

## Supabase
Esta versión no agrega tablas, columnas, buckets ni políticas nuevas.

**No hay que ejecutar ningún SQL nuevo.**

Usa el mismo Supabase que ya funcionaba con V0.7.4.
