-- Clasificación del test (psicométrico/proyectivo), tipo de rendimiento, campos de aplicación y objetivo.
alter table public.tests
  add column clasificacion text not null default 'psicometrico'
    check (clasificacion in ('psicometrico', 'proyectivo')),
  add column rendimiento text not null default 'ejecucion_tipica'
    check (rendimiento in ('ejecucion_maxima', 'ejecucion_tipica')),
  add column campos_aplicacion text[] not null default '{}'
    check (campos_aplicacion <@ array['clinica', 'laboral', 'educativa', 'forense']::text[]),
  add column objetivo text;
