import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

/** Lo mínimo para que un test pueda contestarse y puntuarse. Devuelve la lista de pendientes. */
export async function problemasParaPublicar(
  supabase: SupabaseClient<Database>,
  testId: string,
): Promise<string[]> {
  const [test, dims, qs, reglas] = await Promise.all([
    supabase.from("tests").select("objetivo").eq("id", testId).maybeSingle(),
    supabase.from("dimensions").select("id").eq("test_id", testId),
    supabase.from("questions").select("id, texto").eq("test_id", testId).order("orden"),
    supabase.from("scoring_rules").select("id").eq("test_id", testId),
  ]);
  const ids = (qs.data ?? []).map((q) => q.id);
  const opts = ids.length
    ? await supabase.from("answer_options").select("question_id").in("question_id", ids)
    : { data: [] as { question_id: string }[] };

  const problemas: string[] = [];
  if (!test.data?.objetivo?.trim()) problemas.push("Escribe el objetivo del test (paso 2).");
  if (!dims.data?.length) problemas.push("Agrega al menos un parámetro que evalúe el test (paso 3).");
  if (!qs.data?.length) problemas.push("Agrega al menos una pregunta (paso 3).");

  const porPregunta = new Map<string, number>();
  opts.data?.forEach((o) => porPregunta.set(o.question_id, (porPregunta.get(o.question_id) ?? 0) + 1));
  qs.data?.forEach((q) => {
    if ((porPregunta.get(q.id) ?? 0) < 2) problemas.push(`La pregunta «${q.texto}» necesita al menos 2 respuestas.`);
  });
  if (!reglas.data?.length) problemas.push("Define al menos una regla de resultado (paso 4).");
  return problemas;
}
