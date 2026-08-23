# Red de Actores v0.7.4

Corrección estructural del formulario público de Castings.

- Se reescribió el módulo `js/castings.js` desde cero.
- La página Castings ya no carga `app.js`, evitando lógica ajena al formulario.
- No existe ninguna llamada a `form.reset()` / `.reset()` en el flujo de Castings.
- Se eliminaron también llamadas inseguras a `reset()` del código común.
- Se agregaron validaciones explícitas y mensajes de error más claros.
- No requiere cambios SQL respecto de v0.7.3 / repair 0.7.1.
