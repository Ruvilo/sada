# Convencion de nombres por modulo

Cada modulo debe usar este patron de archivos:

- `<modulo>.router.ts`: define endpoints y middlewares de routing.
- `<modulo>.controller.ts`: recibe request/response y coordina casos de uso.
- `<modulo>.service.ts`: logica de negocio (si aplica).
- `<modulo>.repository.ts`: acceso a datos (si aplica).
- `<modulo>.history.controller.ts`: variante de controller para endpoints historicos.
- `<modulo>.history.router.ts`: router para endpoints historicos.

Reglas:

- Un solo idioma para nombres de archivo: ingles.
- Separador con `.` (dot), no con `-`.
- El nombre base debe ser el nombre del modulo o submodulo.

Ejemplos:

- `employees.router.ts`
- `employees.controller.ts`
- `employees.history.controller.ts`
- `schedules.history.router.ts`
