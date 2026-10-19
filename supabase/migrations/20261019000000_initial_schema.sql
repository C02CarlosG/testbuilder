-- TestBuilder · esquema inicial (aplicado en el proyecto Supabase testbuilder)
-- Motor genérico: preguntas → pesos por dimensión → reglas → resultado.

create extension if not exists pgcrypto;

-- ───────── Tipos ─────────
create type test_tipo     as enum ('perfil', 'aptitud');
create type test_estado   as enum ('borrador', 'publicado');
create type pregunta_tipo as enum ('opcion_multiple', 'escala');

-- ───────── Utilidad: updated_at ─────────
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────── tests ─────────
create table tests (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  nombre        text not null check (length(trim(nombre)) > 0),
  descripcion   text,
  tipo          test_tipo   not null,
  estado        test_estado not null default 'borrador',
  -- Parte pública del link: /t/<slug>. Aleatorio para que no sea adivinable.
  slug          text not null unique
                default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  aviso_privacidad    text,                                  -- texto mostrado antes de contestar
  campos_respondiente jsonb not null default '["nombre"]',   -- datos a pedir (decisión pendiente)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on tests (owner_id);
create trigger tests_updated before update on tests
  for each row execute function set_updated_at();

-- ───────── dimensions (perfiles o competencias a medir) ─────────
create table dimensions (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references tests(id) on delete cascade,
  nombre      text not null,
  descripcion text,
  orden       int  not null default 0,
  unique (test_id, nombre),
  unique (id, test_id)               -- permite FK compuesta desde scoring_rules
);

-- ───────── questions ─────────
create table questions (
  id          uuid primary key default gen_random_uuid(),
  test_id     uuid not null references tests(id) on delete cascade,
  texto       text not null,
  tipo        pregunta_tipo not null default 'opcion_multiple',
  orden       int  not null default 0,
  obligatoria boolean not null default true,
  unique (id, test_id)
);
create index on questions (test_id, orden);

-- ───────── answer_options ─────────
create table answer_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  texto       text not null,
  orden       int  not null default 0,
  unique (id, question_id)           -- permite FK compuesta desde response_answers
);
create index on answer_options (question_id, orden);

-- ───────── option_weights (una opción puede sumar a varias dimensiones) ─────────
create table option_weights (
  option_id    uuid not null references answer_options(id) on delete cascade,
  dimension_id uuid not null references dimensions(id)     on delete cascade,
  puntos       numeric not null default 0,
  primary key (option_id, dimension_id)
);
create index on option_weights (dimension_id);

-- ───────── scoring_rules ─────────
-- perfil:  dimension_id = perfil ganador; min/max opcionales (texto del perfil).
-- aptitud: dimension_id NULL = puntaje total; min/max = rango → nivel.
--          dimension_id lleno = rango de esa competencia en particular.
create table scoring_rules (
  id               uuid primary key default gen_random_uuid(),
  test_id          uuid not null references tests(id) on delete cascade,
  dimension_id     uuid,
  min              numeric,
  max              numeric,
  resultado_titulo text not null,
  resultado_texto  text,
  orden            int not null default 0,
  check (min is null or max is null or min <= max),
  foreign key (dimension_id, test_id) references dimensions(id, test_id) on delete cascade
);
create index on scoring_rules (test_id);

-- ───────── responses ─────────
-- Solo las inserta el servidor (service role) tras calcular el resultado.
create table responses (
  id                 uuid primary key default gen_random_uuid(),
  test_id            uuid not null references tests(id) on delete cascade,
  respondiente_nombre text,
  respondiente_datos  jsonb not null default '{}',   -- campos opcionales (área, puesto, grupo…)
  consentimiento_at   timestamptz,                   -- aceptó el aviso de privacidad
  resultado           jsonb,                         -- puntajes por dimensión + regla aplicada
  created_at          timestamptz not null default now()
);
create index on responses (test_id, created_at desc);

create table response_answers (
  response_id uuid not null references responses(id) on delete cascade,
  question_id uuid not null,
  option_id   uuid not null,
  primary key (response_id, question_id),            -- una respuesta por pregunta
  -- la opción debe pertenecer a la pregunta
  foreign key (option_id, question_id) references answer_options(id, question_id)
);

-- ───────── Integridad entre tablas (mismo test) ─────────
-- option_weights: la dimensión debe ser del mismo test que la pregunta de la opción.
create function check_weight_same_test() returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.answer_options o
    join public.questions q on q.id = o.question_id
    join public.dimensions d on d.id = new.dimension_id and d.test_id = q.test_id
    where o.id = new.option_id
  ) then
    raise exception 'La dimensión y la opción pertenecen a tests distintos';
  end if;
  return new;
end $$;
create trigger option_weights_same_test before insert or update on option_weights
  for each row execute function check_weight_same_test();

-- response_answers: la pregunta debe ser del mismo test que la respuesta.
create function check_answer_same_test() returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from public.responses r
    join public.questions q on q.test_id = r.test_id
    where r.id = new.response_id and q.id = new.question_id
  ) then
    raise exception 'La pregunta no pertenece al test de la respuesta';
  end if;
  return new;
end $$;
create trigger response_answers_same_test before insert or update on response_answers
  for each row execute function check_answer_same_test();

-- ───────── RLS ─────────
alter table tests             enable row level security;
alter table dimensions        enable row level security;
alter table questions         enable row level security;
alter table answer_options    enable row level security;
alter table option_weights    enable row level security;
alter table scoring_rules     enable row level security;
alter table responses         enable row level security;
alter table response_answers  enable row level security;

-- Administradora: CRUD completo sobre lo suyo.
create policy tests_owner on tests for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy dimensions_owner on dimensions for all to authenticated
  using (exists (select 1 from tests t where t.id = test_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from tests t where t.id = test_id and t.owner_id = (select auth.uid())));

create policy questions_owner on questions for all to authenticated
  using (exists (select 1 from tests t where t.id = test_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from tests t where t.id = test_id and t.owner_id = (select auth.uid())));

create policy answer_options_owner on answer_options for all to authenticated
  using (exists (select 1 from questions q join tests t on t.id = q.test_id
                 where q.id = question_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from questions q join tests t on t.id = q.test_id
                      where q.id = question_id and t.owner_id = (select auth.uid())));

create policy option_weights_owner on option_weights for all to authenticated
  using (exists (select 1 from answer_options o join public.questions q on q.id = o.question_id
                 join tests t on t.id = q.test_id
                 where o.id = option_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from answer_options o join public.questions q on q.id = o.question_id
                      join tests t on t.id = q.test_id
                      where o.id = option_id and t.owner_id = (select auth.uid())));

create policy scoring_rules_owner on scoring_rules for all to authenticated
  using (exists (select 1 from tests t where t.id = test_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from tests t where t.id = test_id and t.owner_id = (select auth.uid())));

-- Respuestas: la administradora solo lee y borra las de sus tests. No inserta ni edita.
create policy responses_owner_read on responses for select to authenticated
  using (exists (select 1 from tests t where t.id = test_id and t.owner_id = (select auth.uid())));
create policy responses_owner_delete on responses for delete to authenticated
  using (exists (select 1 from tests t where t.id = test_id and t.owner_id = (select auth.uid())));

create policy response_answers_owner_read on response_answers for select to authenticated
  using (exists (select 1 from responses r join tests t on t.id = r.test_id
                 where r.id = response_id and t.owner_id = (select auth.uid())));

-- Respondiente público (anon): solo lee test publicado, sus preguntas y opciones (texto).
-- NO ve pesos, dimensiones ni reglas (evita que adivine cómo puntuar).
create policy tests_public_read on tests for select to anon
  using (estado = 'publicado');

create policy questions_public_read on questions for select to anon
  using (exists (select 1 from tests t where t.id = test_id and t.estado = 'publicado'));

create policy answer_options_public_read on answer_options for select to anon
  using (exists (select 1 from questions q join tests t on t.id = q.test_id
                 where q.id = question_id and t.estado = 'publicado'));

-- responses / response_answers: SIN política para anon → no pueden leer ni escribir directo.
-- El envío pasa por una ruta de servidor (service role) que valida, calcula y guarda.
revoke all on responses, response_answers, option_weights, scoring_rules, dimensions from anon;
