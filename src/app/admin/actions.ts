"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { numero, texto, textoOpcional } from "@/lib/form";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Cliente con la sesión de la administradora; RLS garantiza que solo toque sus tests.
async function contexto() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

const enc = encodeURIComponent;

/** Vuelve al editor con un mensaje de éxito o error. */
function volver(testId: string, r: { ok?: string; error?: string }, ancla = ""): never {
  const q = r.error ? `error=${enc(r.error)}` : `ok=${enc(r.ok ?? "Guardado")}`;
  revalidatePath(`/admin/tests/${testId}`);
  redirect(`/admin/tests/${testId}?${q}${ancla}`);
}

/** Si el resultado trae error de Postgres/RLS, regresa al editor con el mensaje. */
function chequear(error: { message: string } | null, testId: string, ancla = "") {
  if (error) volver(testId, { error: error.message }, ancla);
}

const camposDe = (f: FormData): string[] => {
  const lista = texto(f, "campos").split(/[\n,]/).map((c) => c.trim()).filter(Boolean);
  return lista.length > 0 ? lista : ["nombre"];
};

// ───────── Tests ─────────

export async function crearTest(formData: FormData) {
  const { supabase, user } = await contexto();
  const tipo = texto(formData, "tipo") === "aptitud" ? "aptitud" : "perfil";
  const { data, error } = await supabase
    .from("tests")
    .insert({
      owner_id: user.id,
      nombre: texto(formData, "nombre"),
      descripcion: textoOpcional(formData, "descripcion"),
      tipo,
      aviso_privacidad: textoOpcional(formData, "aviso"),
      campos_respondiente: camposDe(formData),
    })
    .select("id")
    .single();
  if (error || !data) redirect(`/admin/tests/new?error=${enc(error?.message ?? "No se pudo crear")}`);
  revalidatePath("/admin");
  redirect(`/admin/tests/${data.id}?ok=${enc("Test creado")}`);
}

export async function actualizarTest(testId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase
    .from("tests")
    .update({
      nombre: texto(formData, "nombre"),
      descripcion: textoOpcional(formData, "descripcion"),
      aviso_privacidad: textoOpcional(formData, "aviso"),
      campos_respondiente: camposDe(formData),
    })
    .eq("id", testId);
  chequear(error, testId);
  volver(testId, { ok: "Datos del test guardados" });
}

export async function eliminarTest(testId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("tests").delete().eq("id", testId);
  chequear(error, testId);
  revalidatePath("/admin");
  redirect("/admin");
}

/** Lo mínimo para que un test pueda contestarse y puntuarse. */
async function problemasParaPublicar(supabase: Cliente, testId: string): Promise<string[]> {
  const [dims, qs, reglas] = await Promise.all([
    supabase.from("dimensions").select("id").eq("test_id", testId),
    supabase.from("questions").select("id, texto").eq("test_id", testId),
    supabase.from("scoring_rules").select("id").eq("test_id", testId),
  ]);
  const opts = await supabase
    .from("answer_options")
    .select("question_id")
    .in("question_id", (qs.data ?? []).map((q) => q.id));
  const problemas: string[] = [];
  if (!dims.data?.length) problemas.push("Agrega al menos una dimensión.");
  if (!qs.data?.length) problemas.push("Agrega al menos una pregunta.");
  const porPregunta = new Map<string, number>();
  opts.data?.forEach((o) => porPregunta.set(o.question_id, (porPregunta.get(o.question_id) ?? 0) + 1));
  qs.data?.forEach((q) => {
    if ((porPregunta.get(q.id) ?? 0) < 2) problemas.push(`La pregunta "${q.texto}" necesita al menos 2 opciones.`);
  });
  if (!reglas.data?.length) problemas.push("Define al menos una regla de resultado.");
  return problemas;
}

export async function cambiarEstado(testId: string, estado: "borrador" | "publicado") {
  const { supabase } = await contexto();
  if (estado === "publicado") {
    const problemas = await problemasParaPublicar(supabase, testId);
    if (problemas.length) volver(testId, { error: `No se puede publicar: ${problemas.join(" ")}` });
  }
  const { error } = await supabase.from("tests").update({ estado }).eq("id", testId);
  chequear(error, testId);
  volver(testId, { ok: estado === "publicado" ? "Test publicado" : "Test regresado a borrador" });
}

// ───────── Dimensiones ─────────

export async function agregarDimension(testId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { count } = await supabase.from("dimensions").select("id", { count: "exact", head: true }).eq("test_id", testId);
  const { error } = await supabase.from("dimensions").insert({
    test_id: testId,
    nombre: texto(formData, "nombre"),
    descripcion: textoOpcional(formData, "descripcion"),
    orden: count ?? 0,
  });
  chequear(error, testId, "#dimensiones");
  volver(testId, { ok: "Dimensión agregada" }, "#dimensiones");
}

export async function actualizarDimension(testId: string, dimensionId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase
    .from("dimensions")
    .update({ nombre: texto(formData, "nombre"), descripcion: textoOpcional(formData, "descripcion") })
    .eq("id", dimensionId);
  chequear(error, testId, "#dimensiones");
  volver(testId, { ok: "Dimensión guardada" }, "#dimensiones");
}

export async function eliminarDimension(testId: string, dimensionId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("dimensions").delete().eq("id", dimensionId);
  chequear(error, testId, "#dimensiones");
  volver(testId, { ok: "Dimensión eliminada (se borraron sus pesos y reglas)" }, "#dimensiones");
}

// ───────── Preguntas y opciones ─────────

export async function agregarPregunta(testId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("test_id", testId);
  const tipo = texto(formData, "tipo") === "escala" ? "escala" : "opcion_multiple";
  const { error } = await supabase.from("questions").insert({
    test_id: testId, texto: texto(formData, "texto"), tipo, orden: (count ?? 0) + 1,
  });
  chequear(error, testId, "#preguntas");
  volver(testId, { ok: "Pregunta agregada" }, "#preguntas");
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
  chequear(error, testId, `#p-${preguntaId}`);
  volver(testId, { ok: "Pregunta guardada" }, `#p-${preguntaId}`);
}

export async function eliminarPregunta(testId: string, preguntaId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("questions").delete().eq("id", preguntaId);
  chequear(error, testId, "#preguntas");
  volver(testId, { ok: "Pregunta eliminada" }, "#preguntas");
}

export async function agregarOpcion(testId: string, preguntaId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { count } = await supabase.from("answer_options").select("id", { count: "exact", head: true }).eq("question_id", preguntaId);
  const { error } = await supabase.from("answer_options").insert({
    question_id: preguntaId, texto: texto(formData, "texto"), orden: (count ?? 0) + 1,
  });
  chequear(error, testId, `#p-${preguntaId}`);
  volver(testId, { ok: "Opción agregada" }, `#p-${preguntaId}`);
}

const ESCALA_LIKERT = ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"];

/** Atajo: crea las 5 opciones de una escala Likert (sin pesos; se asignan después). */
export async function agregarEscalaLikert(testId: string, preguntaId: string) {
  const { supabase } = await contexto();
  const { count } = await supabase.from("answer_options").select("id", { count: "exact", head: true }).eq("question_id", preguntaId);
  const base = count ?? 0;
  const { error } = await supabase.from("answer_options").insert(
    ESCALA_LIKERT.map((t, i) => ({ question_id: preguntaId, texto: t, orden: base + i + 1 })),
  );
  chequear(error, testId, `#p-${preguntaId}`);
  volver(testId, { ok: "Escala Likert agregada; asigna los pesos de cada opción" }, `#p-${preguntaId}`);
}

/** Guarda texto, orden y los pesos por dimensión (campos `peso_<dimensionId>`) de una opción. */
export async function actualizarOpcion(testId: string, opcionId: string, preguntaId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase
    .from("answer_options")
    .update({ texto: texto(formData, "texto"), orden: numero(formData, "orden") ?? 0 })
    .eq("id", opcionId);
  chequear(error, testId, `#p-${preguntaId}`);

  const pesos = [...formData.keys()]
    .filter((k) => k.startsWith("peso_"))
    .map((k) => ({
      option_id: opcionId,
      dimension_id: k.slice("peso_".length),
      puntos: numero(formData, k) ?? 0,
    }));
  if (pesos.length) {
    const { error: e2 } = await supabase.from("option_weights").upsert(pesos, { onConflict: "option_id,dimension_id" });
    chequear(e2, testId, `#p-${preguntaId}`);
  }
  volver(testId, { ok: "Opción y pesos guardados" }, `#p-${preguntaId}`);
}

export async function eliminarOpcion(testId: string, opcionId: string, preguntaId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("answer_options").delete().eq("id", opcionId);
  chequear(error, testId, `#p-${preguntaId}`);
  volver(testId, { ok: "Opción eliminada" }, `#p-${preguntaId}`);
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
  chequear(error, testId, "#reglas");
  volver(testId, { ok: "Regla agregada" }, "#reglas");
}

export async function actualizarRegla(testId: string, reglaId: string, formData: FormData) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("scoring_rules").update(datosRegla(formData)).eq("id", reglaId);
  chequear(error, testId, "#reglas");
  volver(testId, { ok: "Regla guardada" }, "#reglas");
}

export async function eliminarRegla(testId: string, reglaId: string) {
  const { supabase } = await contexto();
  const { error } = await supabase.from("scoring_rules").delete().eq("id", reglaId);
  chequear(error, testId, "#reglas");
  volver(testId, { ok: "Regla eliminada" }, "#reglas");
}
