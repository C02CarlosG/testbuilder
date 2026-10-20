// Carga desde Supabase lo necesario para reportes y exportaciones (con la sesión de la administradora;
// RLS garantiza que solo vea lo suyo).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import type { Detalle, Opcion, Pregunta, RespuestaGuardada, TestInfo } from "./reportes";
import type { Resultado } from "./scoring/types";

type Cliente = SupabaseClient<Database>;

const PAGINA = 1000; // tope de filas por consulta en Supabase

export async function cargarTest(supabase: Cliente, testId: string) {
  const { data: test } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
  if (!test) return null;

  const [dims, qs] = await Promise.all([
    supabase.from("dimensions").select("id, nombre").eq("test_id", testId).order("orden"),
    supabase.from("questions").select("id, texto, orden").eq("test_id", testId).order("orden"),
  ]);
  const preguntas: Pregunta[] = qs.data ?? [];
  const opciones: Opcion[] = preguntas.length
    ? ((await supabase.from("answer_options").select("id, question_id, texto").in("question_id", preguntas.map((q) => q.id))).data ?? [])
    : [];

  const info: TestInfo = { nombre: test.nombre, descripcion: test.descripcion, objetivo: test.objetivo, tipo: test.tipo };
  return { test, info, campos: test.campos_respondiente as string[], dims: dims.data ?? [], preguntas, opciones };
}

type FilaRespuesta = Database["public"]["Tables"]["responses"]["Row"];
const convertir = (r: FilaRespuesta): RespuestaGuardada => ({
  id: r.id,
  created_at: r.created_at,
  respondiente_nombre: r.respondiente_nombre,
  respondiente_datos: (r.respondiente_datos ?? {}) as Record<string, string>,
  resultado: r.resultado as unknown as Resultado | null,
});

/** Todas las respuestas del test (más recientes primero), paginando de 1000 en 1000. */
export async function cargarRespuestas(supabase: Cliente, testId: string): Promise<RespuestaGuardada[]> {
  const todas: RespuestaGuardada[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data } = await supabase
      .from("responses").select("*").eq("test_id", testId)
      .order("created_at", { ascending: false }).range(desde, desde + PAGINA - 1);
    todas.push(...(data ?? []).map(convertir));
    if ((data?.length ?? 0) < PAGINA) return todas;
  }
}

export async function cargarUnaRespuesta(supabase: Cliente, testId: string, respuestaId: string) {
  const { data } = await supabase.from("responses").select("*").eq("id", respuestaId).eq("test_id", testId).maybeSingle();
  return data ? convertir(data) : null;
}

/** Respuestas elegidas por pregunta. Se pide por lotes para no pasar el tope de filas ni el largo de la URL. */
export async function cargarDetalle(supabase: Cliente, respuestaIds: string[], nPreguntas: number): Promise<Detalle[]> {
  if (respuestaIds.length === 0) return [];
  const lote = Math.max(1, Math.min(100, Math.floor(900 / Math.max(1, nPreguntas))));
  const pedidos: Promise<Detalle[]>[] = [];
  for (let i = 0; i < respuestaIds.length; i += lote) {
    pedidos.push(
      (async () =>
        (await supabase.from("response_answers").select("response_id, question_id, option_id")
          .in("response_id", respuestaIds.slice(i, i + lote))).data ?? [])(),
    );
  }
  return (await Promise.all(pedidos)).flat();
}
