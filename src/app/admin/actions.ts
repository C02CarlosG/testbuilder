"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { numero, texto, textoOpcional } from "@/lib/form";
import { CAMPOS_APLICACION, CLASIFICACIONES, FORMAS_DE_CALIFICAR, RENDIMIENTOS } from "@/lib/catalogo";
import { problemasParaPublicar } from "@/lib/publicable";

// Cliente con la sesión de la administradora; RLS garantiza que solo toque sus tests.
async function contexto() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const enc = encodeURIComponent;

/** Pantallas del asistente: cada acción vuelve a la suya. */
type Pantalla = "preguntas" | "resultados" | "configurar";
const ruta = (testId: string, p: Pantalla) =>
  p === "preguntas" ? `/admin/tests/${testId}` : `/admin/tests/${testId}/${p}`;

/** Vuelve a la pantalla con un mensaje de éxito o error. */
function volver(testId: string, p: Pantalla, r: { ok?: string; error?: string }, ancla = ""): never {
  const q = r.error ? `error=${enc(r.error)}` : `ok=${enc(r.ok ?? "Guardado")}`;
  revalidatePath(ruta(testId, p));
  redirect(`${ruta(testId, p)}?${q}${ancla}`);
}

/** Si el resultado trae error de Postgres/RLS, regresa a la pantalla con el mensaje. */
function chequear(error: { message: string } | null, testId: string, p: Pantalla, ancla = "") {
  if (error) volver(testId, p, { error: error.message }, ancla);
}

// ───────── Test: paso 1 (datos básicos) y paso 2 (configuración) ─────────

export async function crearTest(formData: FormData) {
  const { supabase, user } = await contexto();
  const { data, error } = await supabase
    .from("tests")
    .insert({
      owner_id: user.id,
      nombre: texto(formData, "nombre"),
      descripcion: textoOpcional(formData, "descripcion"),
      tipo: "perfil", // se define en el paso 2 («forma de calificar»)
    })
    .select("id")
    .single();
  if (error || !data) redirect(`/admin/tests/new?error=${enc(error?.message ?? "No se pudo crear")}`);
  revalidatePath("/admin");
  redirect(`/admin/tests/${data.id}/configurar`);
}

const valorDe = <V extends string>(lista: { valor: V }[], v: string): V | null =>
  lista.find((o) => o.valor === v)?.valor ?? null;

export async function guardarConfiguracion(testId: string, formData: FormData) {
  const { supabase } = await contexto();
  const clasificacion = valorDe(CLASIFICACIONES, texto(formData, "clasificacion"));
  const rendimiento = valorDe(RENDIMIENTOS, texto(formData, "rendimiento"));
  const tipo = valorDe(FORMAS_DE_CALIFICAR, texto(formData, "tipo"));
  if (!clasificacion || !rendimiento || !tipo) {
    volver(testId, "configurar", { error: "Elige la clasificación, el tipo de rendimiento y la forma de calificar." });
  }
  const objetivo = texto(formData, "objetivo");
  if (!objetivo) volver(testId, "configurar", { error: "Escribe el objetivo del test." });

  const campos = formData.getAll("campos_aplicacion").map(String)
    .filter((c) => CAMPOS_APLICACION.some((o) => o.valor === c));

  const { error } = await supabase
    .from("tests")
    .update({
      nombre: texto(formData, "nombre"),
      descripcion: textoOpcional(formData, "descripcion"),
      clasificacion, rendimiento, tipo, objetivo,
      campos_aplicacion: campos,
      aviso_privacidad: textoOpcional(formData, "aviso"),
    })
    .eq("id", testId);
  chequear(error, testId, "configurar");
  revalidatePath("/admin");
  redirect(`/admin/tests/${testId}?ok=${enc("Configuración guardada. Ahora agrega las preguntas.")}`);
}

export async function eliminarTest(testId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("tests").delete().eq("id", testId);
  chequear(error, testId, "resultados");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function cambiarEstado(testId: string, estado: "borrador" | "publicado") {
  const { supabase } = await contexto();
  if (estado === "publicado") {
    const problemas = await problemasParaPublicar(supabase, testId);
    if (problemas.length) volver(testId, "resultados", { error: `No se puede publicar: ${problemas.join(" ")}` });
  }
  const { error } = await supabase.from("tests").update({ estado }).eq("id", testId);
  chequear(error, testId, "resultados");
  volver(testId, "resultados", { ok: estado === "publicado" ? "Test publicado" : "Test regresado a borrador" });
}

// ───────── Datos que se piden a quien contesta ─────────

async function campos(supabase: Awaited<ReturnType<typeof contexto>>["supabase"], testId: string) {
  const { data } = await supabase.from("tests").select("campos_respondiente").eq("id", testId).maybeSingle();
  return (data?.campos_respondiente as string[] | undefined) ?? [];
}

async function guardarCampos(testId: string, lista: string[], mensaje: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("tests").update({ campos_respondiente: lista }).eq("id", testId);
  chequear(error, testId, "preguntas", "#datos");
  volver(testId, "preguntas", { ok: mensaje }, "#datos");
}

export async function agregarCampo(testId: string, nombre: string, formData?: FormData) {
  const { supabase } = await contexto();
  const nuevo = (nombre || (formData ? texto(formData, "campo") : "")).trim();
  if (!nuevo) volver(testId, "preguntas", { error: "Escribe el nombre del dato." }, "#datos");
  const actuales = await campos(supabase, testId);
  if (actuales.some((c) => c.toLowerCase() === nuevo.toLowerCase())) {
    volver(testId, "preguntas", { error: `«${nuevo}» ya está en la lista.` }, "#datos");
  }
  await guardarCampos(testId, [...actuales, nuevo], `Se pedirá: ${nuevo}`);
}

export async function quitarCampo(testId: string, nombre: string) {
  const { supabase } = await contexto();
  const resto = (await campos(supabase, testId)).filter((c) => c !== nombre);
  if (resto.length === 0) volver(testId, "preguntas", { error: "Debe pedirse al menos un dato (por ejemplo, el nombre)." }, "#datos");
  await guardarCampos(testId, resto, `Ya no se pedirá: ${nombre}`);
}

// ───────── Parámetros que evalúa (dimensiones) ─────────

export async function agregarDimension(testId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { count } = await supabase.from("dimensions").select("id", { count: "exact", head: true }).eq("test_id", testId);
  const { error } = await supabase.from("dimensions").insert({
    test_id: testId,
    nombre: texto(formData, "nombre"),
    descripcion: textoOpcional(formData, "descripcion"),
    orden: count ?? 0,
  });
  chequear(error, testId, "preguntas", "#parametros");
  volver(testId, "preguntas", { ok: "Parámetro agregado" }, "#parametros");
}

export async function actualizarDimension(testId: string, dimensionId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase
    .from("dimensions")
    .update({ nombre: texto(formData, "nombre"), descripcion: textoOpcional(formData, "descripcion") })
    .eq("id", dimensionId);
  chequear(error, testId, "preguntas", "#parametros");
  volver(testId, "preguntas", { ok: "Parámetro guardado" }, "#parametros");
}

export async function eliminarDimension(testId: string, dimensionId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("dimensions").delete().eq("id", dimensionId);
  chequear(error, testId, "preguntas", "#parametros");
  volver(testId, "preguntas", { ok: "Parámetro eliminado (se borraron sus puntos y reglas)" }, "#parametros");
}

// ───────── Preguntas y respuestas ─────────

export async function agregarPregunta(testId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("test_id", testId);
  const tipo = texto(formData, "tipo") === "escala" ? "escala" : "opcion_multiple";
  const { error } = await supabase.from("questions").insert({
    test_id: testId, texto: texto(formData, "texto"), tipo, orden: (count ?? 0) + 1,
  });
  chequear(error, testId, "preguntas", "#preguntas");
  volver(testId, "preguntas", { ok: "Pregunta agregada. Ahora agrega sus respuestas." }, "#preguntas");
}

export async function actualizarPregunta(testId: string, preguntaId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase
    .from("questions")
    .update({
      texto: texto(formData, "texto"),
      orden: numero(formData, "orden") ?? 0,
      obligatoria: formData.get("obligatoria") === "on",
    })
    .eq("id", preguntaId);
  chequear(error, testId, "preguntas", `#p-${preguntaId}`);
  volver(testId, "preguntas", { ok: "Pregunta guardada" }, `#p-${preguntaId}`);
}

export async function eliminarPregunta(testId: string, preguntaId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("questions").delete().eq("id", preguntaId);
  chequear(error, testId, "preguntas", "#preguntas");
  volver(testId, "preguntas", { ok: "Pregunta eliminada" }, "#preguntas");
}

export async function agregarOpcion(testId: string, preguntaId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { count } = await supabase.from("answer_options").select("id", { count: "exact", head: true }).eq("question_id", preguntaId);
  const { error } = await supabase.from("answer_options").insert({
    question_id: preguntaId, texto: texto(formData, "texto"), orden: (count ?? 0) + 1,
  });
  chequear(error, testId, "preguntas", `#p-${preguntaId}`);
  volver(testId, "preguntas", { ok: "Respuesta agregada. Asigna sus puntos al parámetro que evalúa." }, `#p-${preguntaId}`);
}

const ESCALA_LIKERT = ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"];

/** Atajo: crea las 5 respuestas de una escala Likert; si ya hay parámetros, da 1 a 5 puntos al primero. */
export async function agregarEscalaLikert(testId: string, preguntaId: string) {
  const { supabase } = await contexto();
  const { count } = await supabase.from("answer_options").select("id", { count: "exact", head: true }).eq("question_id", preguntaId);
  const base = count ?? 0;
  const { data: creadas, error } = await supabase
    .from("answer_options")
    .insert(ESCALA_LIKERT.map((t, i) => ({ question_id: preguntaId, texto: t, orden: base + i + 1 })))
    .select("id, orden");
  chequear(error, testId, "preguntas", `#p-${preguntaId}`);

  const { data: dims } = await supabase.from("dimensions").select("id").eq("test_id", testId).order("orden").limit(1);
  if (dims?.[0] && creadas) {
    const { error: e2 } = await supabase.from("option_weights").insert(
      creadas.map((o) => ({ option_id: o.id, dimension_id: dims[0].id, puntos: o.orden - base })),
    );
    chequear(e2, testId, "preguntas", `#p-${preguntaId}`);
  }
  volver(testId, "preguntas", { ok: "Escala Likert agregada (1 a 5 puntos al primer parámetro; ajústalos si hace falta)" }, `#p-${preguntaId}`);
}

/** Guarda texto, orden y los puntos por parámetro (campos `peso_<dimensionId>`) de una respuesta. */
export async function actualizarOpcion(testId: string, opcionId: string, preguntaId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase
    .from("answer_options")
    .update({ texto: texto(formData, "texto"), orden: numero(formData, "orden") ?? 0 })
    .eq("id", opcionId);
  chequear(error, testId, "preguntas", `#p-${preguntaId}`);

  const pesos = [...formData.keys()]
    .filter((k) => k.startsWith("peso_"))
    .map((k) => ({ option_id: opcionId, dimension_id: k.slice("peso_".length), puntos: numero(formData, k) ?? 0 }));
  if (pesos.length) {
    const { error: e2 } = await supabase.from("option_weights").upsert(pesos, { onConflict: "option_id,dimension_id" });
    chequear(e2, testId, "preguntas", `#p-${preguntaId}`);
  }
  volver(testId, "preguntas", { ok: "Respuesta y puntos guardados" }, `#p-${preguntaId}`);
}

export async function eliminarOpcion(testId: string, opcionId: string, preguntaId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("answer_options").delete().eq("id", opcionId);
  chequear(error, testId, "preguntas", `#p-${preguntaId}`);
  volver(testId, "preguntas", { ok: "Respuesta eliminada" }, `#p-${preguntaId}`);
}

// ───────── Reglas de resultado ─────────

function datosRegla(f: FormData) {
  const dim = texto(f, "dimension");
  return {
    dimension_id: dim === "total" || dim === "" ? null : dim,
    min: numero(f, "min"),
    max: numero(f, "max"),
    resultado_titulo: texto(f, "titulo"),
    resultado_texto: textoOpcional(f, "descripcion"),
    orden: numero(f, "orden") ?? 0,
  };
}

export async function agregarRegla(testId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("scoring_rules").insert({ test_id: testId, ...datosRegla(formData) });
  chequear(error, testId, "resultados", "#reglas");
  volver(testId, "resultados", { ok: "Regla agregada" }, "#reglas");
}

export async function actualizarRegla(testId: string, reglaId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("scoring_rules").update(datosRegla(formData)).eq("id", reglaId);
  chequear(error, testId, "resultados", "#reglas");
  volver(testId, "resultados", { ok: "Regla guardada" }, "#reglas");
}

export async function eliminarRegla(testId: string, reglaId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("scoring_rules").delete().eq("id", reglaId);
  chequear(error, testId, "resultados", "#reglas");
  volver(testId, "resultados", { ok: "Regla eliminada" }, "#reglas");
}

// ───────── Respuestas recibidas ─────────

export async function eliminarRespuesta(testId: string, respuestaId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("responses").delete().eq("id", respuestaId);
  if (error) redirect(`/admin/tests/${testId}/respuestas?error=${enc(error.message)}`);
  revalidatePath(`/admin/tests/${testId}/respuestas`);
  redirect(`/admin/tests/${testId}/respuestas?ok=${enc("Respuesta eliminada")}`);
}
