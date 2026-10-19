# PLAN.md — TestBuilder

## Visión
Plataforma donde una ingeniera industrial crea tests propios (preguntas, pesos, reglas de resultado), comparte un link público, y cada persona que contesta recibe un reporte individual. Dos usos: **clasificación de perfiles** y **medición de aptitud/nivel**.

## Usuarios
- **Administradora** (la ingeniera): login, crea y gestiona tests, ve resultados.
- **Respondiente** (estudiante o empleado): sin cuenta, entra por link público.

## Estado del proyecto (actualizado en cada cierre de fase)

| Fase | Estado |
|---|---|
| 0 — Preparación | ✅ Lista (falta solo `.env.local` en la máquina de la usuaria) |
| 1 — Modelo de datos | ✅ Migraciones aplicadas en Supabase `testbuilder`; RLS probada |
| 2 — Motor de puntuación | ✅ 17 pruebas pasan; falta contrastar con un test real |
| 3 — Panel de administradora | ✅ Login, CRUD completo, vista previa y publicar; probado de punta a punta |
| 4 — Formulario público | ⏳ Siguiente |
| 5 — Reportes y resultados | ⬜ Pendiente |
| 6 — Pruebas y despliegue | ⬜ Pendiente |

**Decisiones tomadas:** respuestas se guardan solo vía servidor (service role) · cada administradora ve solo lo suyo ·
tests editables sin restricción, con confirmación si ya tienen respuestas · campos del respondiente configurables por test ·
sin registro público de administradoras (las cuentas se crean desde el panel de Supabase).

## Fases

### Fase 0 — Preparación
- Crear proyecto Next.js + TypeScript + Tailwind.
- Crear proyecto en Supabase y conectar variables de entorno.
- Repositorio en GitHub, `.env.example`, README básico.
- **Listo cuando:** la app corre local y hay conexión a Supabase.

### Fase 1 — Modelo de datos
Tablas (borrador):
- `tests` (id, owner_id, nombre, descripcion, tipo: `perfil` | `aptitud`, estado: borrador/publicado, slug)
- `dimensions` (id, test_id, nombre, descripcion) — ej. cada perfil o competencia a medir
- `questions` (id, test_id, texto, tipo: opción múltiple | escala, orden)
- `answer_options` (id, question_id, texto, orden)
- `option_weights` (option_id, dimension_id, puntos) — una opción puede sumar a varias dimensiones
- `scoring_rules` (id, test_id, dimension_id nullable, min, max, resultado_titulo, resultado_texto)
- `responses` (id, test_id, datos del respondiente, created_at, resultado calculado en JSON)
- `response_answers` (response_id, question_id, option_id)
- RLS en todas las tablas.
- **Listo cuando:** migración aplicada y políticas RLS probadas.

### Fase 2 — Motor de puntuación
- Función en servidor: dadas las respuestas, suma puntos por dimensión.
- Tipo `perfil`: gana la dimensión con mayor puntaje (con manejo de empates).
- Tipo `aptitud`: puntaje total contra rangos → nivel.
- Pruebas unitarias con casos de ambos tipos.
- **Listo cuando:** las pruebas pasan.

### Fase 3 — Panel de administradora
- Login (Supabase Auth).
- CRUD de tests: preguntas, opciones, pesos por dimensión, reglas de resultado.
- Vista previa del test y botón publicar (genera link público).
- **Listo cuando:** puede armar un test completo sin tocar código.

### Fase 4 — Formulario público
- Ruta pública por slug, flujo pregunta por pregunta, barra de avance.
- Captura de datos del respondiente (nombre y campos opcionales).
- Al terminar: llamada al servidor, cálculo y pantalla de resultado.
- **Listo cuando:** una persona sin cuenta completa un test de punta a punta.

### Fase 5 — Reportes y resultados
- Reporte individual (pantalla + PDF descargable).
- Panel de resultados por test: lista de respondientes, resultado, exportar a Excel/CSV.
- **Listo cuando:** la ingeniera puede revisar y exportar resultados.

### Fase 6 — Pruebas y despliegue
- Cargar un test real de ejemplo (el que ella ya tiene definido).
- Revisión de seguridad (RLS, rate limiting en envío de respuestas).
- Despliegue en Vercel con variables de entorno, dominio opcional.
- **Listo cuando:** la ingeniera aplica un test real en producción.

## Decisiones pendientes (resolver antes de Fase 3)
- ¿Solo una administradora o varias (multi-tenant)?
- Tipos de pregunta necesarios: opción múltiple, escala Likert, otros.
- Datos que se piden al respondiente y aviso de privacidad (son datos personales).
- Formato y diseño del reporte (logo, colores, contenido).

## Riesgos
- Reglas de puntuación más complejas de lo previsto → mantener el motor basado en datos y ampliar con tipos de regla nuevos.
- Privacidad de resultados de empleados → RLS estricta y aviso de privacidad.
- Plan gratuito de Supabase se pausa por inactividad → considerar plan de pago al entrar en producción.
