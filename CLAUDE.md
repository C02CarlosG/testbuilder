# TestBuilder — Plataforma genérica de tests organizacionales

## Contexto del proyecto

Plataforma a la medida para una ingeniera industrial que:
- Da clases de estructura organizacional en la Facultad de Contaduría y Administración.
- Asesora empresas y dentro de ese trabajo aplica tests a empleados.

Ella ya tiene el contenido resuelto (preguntas, perfiles, reglas de puntuación).
Lo que necesita es la plataforma donde crear, administrar y aplicar sus tests,
sin depender de formularios genéricos (Google Forms, Typeform, etc.).

Este proyecto reutiliza aprendizajes del proyecto hermano "test vocacional"
(captura de datos + generación de reportes individuales), pero generalizado:
en vez de un test fijo, debe soportar múltiples tests con su propia lógica
de puntuación y resultados.

## Casos de uso que debe cubrir

1. **Clasificación de perfiles** — ej. tipo de liderazgo o perfil organizacional.
2. **Medición de aptitud/nivel** — ej. nivel de aptitud hacia un puesto específico.

Ambos casos deben poder modelarse con el mismo motor genérico de
preguntas → pesos → reglas → resultado.

## Stack tecnológico

- **Frontend + Backend**: Next.js (React, App Router, TypeScript, Tailwind), desplegado en Vercel.
- **Base de datos**: Supabase (Postgres + Auth + Row Level Security).
- **Cálculo de resultados**: en el servidor (backend de Next.js o Supabase),
  evaluado al momento en que la persona termina el test. Nunca en el cliente.
- **Idioma de la interfaz**: español (México).

## Arquitectura funcional

### Panel de administrador (uso de la ingeniera, con login)
- Crear un nuevo test.
- Definir preguntas y tipo de respuesta.
- Asignar peso/puntaje a cada respuesta posible.
- Definir reglas de resultado (ej. rangos de puntaje → perfil o nivel).
- Ver resultados y respuestas de quienes contestaron cada test.

### Formulario público (uso del respondiente, sin cuenta)
- Link único por test, compartido por la ingeniera.
- La persona contesta sin necesidad de registro.
- Al terminar, el sistema calcula el resultado según las reglas definidas
  por la ingeniera y genera el reporte individual (igual que en el test
  vocacional, pero reutilizable para cualquier test, no uno fijo).

## Modelo de datos (borrador inicial — a validar antes de implementar)

- `tests`: id, nombre, descripción, tipo (perfil / aptitud), owner (ingeniera).
- `questions`: id, test_id, texto, tipo de respuesta (opción múltiple, escala, etc.).
- `answer_options`: id, question_id, texto, peso/puntaje.
- `scoring_rules`: id, test_id, condición (ej. rango de puntaje por dimensión),
  resultado asociado (perfil o nivel).
- `responses`: id, test_id, respondiente (sin cuenta, solo metadata opcional),
  fecha, respuestas capturadas, resultado calculado.

## Reglas para el desarrollo

- El motor de puntuación es genérico y basado en datos; nada de lógica de un test específico en el código.
- RLS activo en todas las tablas: la administradora solo ve sus tests y respuestas;
  el respondiente público solo lee un test publicado e inserta su respuesta.
- Variables de entorno en `.env.local`; nunca subir llaves al repositorio. Incluir `.env.example`.
- Pruebas unitarias para el motor de puntuación.
- Trabajar por fases según `PLAN.md` y esperar confirmación al cerrar cada una.
- Si algo es ambiguo, preguntar en vez de suponer.

## Diferencia clave vs. el test vocacional

El test vocacional (Streamlit) fue un test fijo, rápido de armar, con una sola
lógica de puntuación hardcodeada. TestBuilder debe ser genérico: la ingeniera
crea y administra múltiples tests por su cuenta, cada uno con su propia
estructura de preguntas y reglas, sin que Carlos tenga que intervenir cada vez.

## Estado actual

Ver la tabla "Estado del proyecto" en `PLAN.md`. Fases 0–4 construidas; sigue la Fase 5 (reportes). Pendiente verificar el envío real con la llave service role.
Panel = asistente de 4 pasos: `/admin/tests/new` → `/[id]/configurar` → `/[id]` (preguntas) → `/[id]/resultados`.
Notas técnicas: Next.js 16 (el archivo de middleware se llama `proxy.ts`), `cacheComponents` desactivado,
tipos de BD en `src/lib/supabase/database.types.ts`, motor en `src/lib/scoring/`.
