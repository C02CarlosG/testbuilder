"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { calcularResultado } from "@/lib/scoring/engine";
import { ScoringError, type Resultado, type ScoringInput } from "@/lib/scoring/types";
import { EnvioError, validarEntrada } from "@/lib/envio";
import type { Json } from "@/lib/supabase/database.types";

export type RespuestaEnvio = { ok: true; resultado: Resultado } | { ok: false; error: string };

// El cálculo ocurre aquí, en el servidor. Se usa service role porque el público no puede leer
// pesos ni reglas, ni escribir en responses (RLS); este es el único camino de escritura.
export async function enviarRespuestas(slug: string, raw: unknown): Promise<RespuestaEnvio> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Falta SUPABASE_SERVICE_ROLE_KEY");
      return { ok: false, error: "El servicio no está disponible por el momento." };
    }
    const db = createServiceClient();

    const { data: test } = await db
      .from("tests").select("*").eq("slug", String(slug)).eq("estado", "publicado").maybeSingle();
    if (!test) return { ok: false, error: "Este test no está disponible." };

    const campos = (test.campos_respondiente as string[]) ?? ["nombre"];
    const entrada = validarEntrada(raw, campos, Boolean(test.aviso_privacidad));

    const [dims, qs, reglas] = await Promise.all([
      db.from("dimensions").select("id, nombre").eq("test_id", test.id),
      db.from("questions").select("id, obligatoria").eq("test_id", test.id),
      db.from("scoring_rules").select("*").eq("test_id", test.id),
    ]);
    const preguntaIds = (qs.data ?? []).map((q) => q.id);
    const { data: opciones } = await db.from("answer_options").select("id, question_id").in("question_id", preguntaIds);
    const { data: pesos } = await db.from("option_weights").select("*").in("option_id", (opciones ?? []).map((o) => o.id));

    const input: ScoringInput = {
      tipo: test.tipo,
      dimensiones: dims.data ?? [],
      preguntas: (qs.data ?? []).map((q) => ({
        id: q.id,
        obligatoria: q.obligatoria,
        opcionIds: (opciones ?? []).filter((o) => o.question_id === q.id).map((o) => o.id),
      })),
      pesos: (pesos ?? []).map((p) => ({ opcionId: p.option_id, dimensionId: p.dimension_id, puntos: p.puntos })),
      reglas: (reglas.data ?? []).map((r) => ({
        id: r.id, dimensionId: r.dimension_id, min: r.min, max: r.max,
        titulo: r.resultado_titulo, texto: r.resultado_texto, orden: r.orden,
      })),
      respuestas: entrada.respuestas,
    };
    const resultado = calcularResultado(input);

    const { data: resp, error: errResp } = await db
      .from("responses")
      .insert({
        test_id: test.id,
        respondiente_nombre: entrada.datos["nombre"] ?? null,
        respondiente_datos: entrada.datos,
        consentimiento_at: test.aviso_privacidad ? new Date().toISOString() : null,
        resultado: resultado as unknown as Json,
      })
      .select("id")
      .single();
    if (errResp || !resp) throw errResp ?? new Error("No se pudo guardar la respuesta");

    const { error: errAns } = await db.from("response_answers").insert(
      entrada.respuestas.map((r) => ({ response_id: resp.id, question_id: r.preguntaId, option_id: r.opcionId })),
    );
    if (errAns) {
      await db.from("responses").delete().eq("id", resp.id); // no dejar respuestas a medias
      throw errAns;
    }
    return { ok: true, resultado };
  } catch (e) {
    if (e instanceof EnvioError || e instanceof ScoringError) return { ok: false, error: e.message };
    console.error("enviarRespuestas falló", e);
    return { ok: false, error: "No pudimos guardar tus respuestas. Inténtalo de nuevo." };
  }
}
