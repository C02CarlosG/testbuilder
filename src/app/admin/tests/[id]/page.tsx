import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Pasos } from "@/components/Pasos";
import { DATOS_SUGERIDOS } from "@/lib/catalogo";
import {
  actualizarDimension, actualizarOpcion, actualizarPregunta, agregarCampo, agregarDimension,
  agregarEscalaLikert, agregarOpcion, agregarPregunta, eliminarDimension, eliminarOpcion,
  eliminarPregunta, quitarCampo,
} from "../../actions";
import { btn, btnDanger, btnGhost, card, input, label } from "../../ui";

export const metadata = { title: "Preguntas del test · TestBuilder" };

// Paso 3: datos que se piden, parámetros que evalúa y preguntas con sus respuestas.
export default async function PreguntasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();

  const { data: test } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
  if (!test) notFound(); // RLS: tests ajenos tampoco aparecen

  const [dimsR, qsR, respR] = await Promise.all([
    supabase.from("dimensions").select("*").eq("test_id", id).order("orden"),
    supabase.from("questions").select("*").eq("test_id", id).order("orden"),
    supabase.from("responses").select("id", { count: "exact", head: true }).eq("test_id", id),
  ]);
  const dims = dimsR.data ?? [];
  const preguntas = qsR.data ?? [];
  const nRespuestas = respR.count ?? 0;

  const preguntaIds = preguntas.map((q) => q.id);
  const opciones = preguntaIds.length
    ? ((await supabase.from("answer_options").select("*").in("question_id", preguntaIds).order("orden")).data ?? [])
    : [];
  const pesosRows = opciones.length
    ? ((await supabase.from("option_weights").select("*").in("option_id", opciones.map((o) => o.id))).data ?? [])
    : [];
  const peso = new Map(pesosRows.map((w) => [`${w.option_id}:${w.dimension_id}`, w.puntos]));

  // Si ya hay respuestas, cada cambio pide confirmación (permite probar antes de lanzar).
  const confirmar = nRespuestas > 0
    ? `Este test ya tiene ${nRespuestas} respuesta(s). Cambiarlo puede alterar el significado de los resultados ya guardados. ¿Continuar?`
    : undefined;

  const pedidos = test.campos_respondiente as string[];
  const sugeridos = DATOS_SUGERIDOS.filter((s) => !pedidos.some((p) => p.toLowerCase() === s.toLowerCase()));

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-indigo-700 hover:underline">← Mis tests</Link>
        <h1 className="mt-2 mb-4 text-xl font-semibold text-slate-900">{test.nombre}</h1>
        <Pasos actual={3} testId={id} />
      </div>

      {ok && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {nRespuestas > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Este test tiene {nRespuestas} respuesta(s). Se te pedirá confirmación antes de cada cambio.
        </p>
      )}

      {/* A. Datos que se piden */}
      <section id="datos" className={`${card} space-y-3`}>
        <h2 className="font-semibold text-slate-900">Datos que se piden a quien contesta</h2>
        <p className="text-sm text-slate-600">Toca un botón para agregar un dato. Quien conteste deberá llenarlos antes de empezar.</p>
        <ul className="flex flex-wrap gap-2">
          {pedidos.map((c) => (
            <li key={c} className="flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-sm text-indigo-900">
              <span className="capitalize">{c}</span>
              <form action={quitarCampo.bind(null, id, c)}>
                <ConfirmButton className="rounded-full px-2 text-indigo-700 hover:bg-indigo-100" aria-label={`Quitar ${c}`} confirmar={confirmar}>×</ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {sugeridos.map((s) => (
            <form key={s} action={agregarCampo.bind(null, id, s)}>
              <ConfirmButton className={btnGhost} confirmar={confirmar}>+ {s}</ConfirmButton>
            </form>
          ))}
        </div>
        <form action={agregarCampo.bind(null, id, "")} className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <label className={label} htmlFor="campo">Otro dato</label>
            <input id="campo" name="campo" required className={input} placeholder="Ej.: Departamento" />
          </div>
          <ConfirmButton className={btnGhost} confirmar={confirmar}>+ Agregar dato</ConfirmButton>
        </form>
      </section>

      {/* B. Parámetros que evalúa */}
      <section id="parametros" className={`${card} space-y-3`}>
        <h2 className="font-semibold text-slate-900">
          Parámetros que evalúa {test.tipo === "perfil" ? "(los perfiles)" : "(las competencias)"}
        </h2>
        <p className="text-sm text-slate-600">
          {test.tipo === "perfil"
            ? "Cada respuesta suma puntos a uno o más parámetros; el perfil final es el de mayor puntaje."
            : "Cada respuesta suma puntos a uno o más parámetros; el nivel sale del puntaje total."}
          {" "}Créalos primero: luego asignarás puntos a cada respuesta.
        </p>
        {dims.map((d) => (
          <div key={d.id} className="flex flex-wrap items-end gap-2">
            <form action={actualizarDimension.bind(null, id, d.id)} className="flex flex-1 flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1">
                <label className={label}>Nombre</label>
                <input name="nombre" required defaultValue={d.nombre} className={input} />
              </div>
              <div className="min-w-40 flex-[2]">
                <label className={label}>Descripción</label>
                <input name="descripcion" defaultValue={d.descripcion ?? ""} className={input} />
              </div>
              <ConfirmButton className={btnGhost} confirmar={confirmar}>Guardar</ConfirmButton>
            </form>
            <form action={eliminarDimension.bind(null, id, d.id)}>
              <ConfirmButton className={btnDanger} confirmar={confirmar ?? "Se borrarán también los puntos y reglas de este parámetro. ¿Continuar?"}>Eliminar</ConfirmButton>
            </form>
          </div>
        ))}
        <form action={agregarDimension.bind(null, id)} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <div className="min-w-40 flex-1">
            <label className={label}>Nuevo parámetro</label>
            <input name="nombre" required className={input} placeholder={test.tipo === "perfil" ? "Ej.: Líder democrático" : "Ej.: Razonamiento numérico"} />
          </div>
          <div className="min-w-40 flex-[2]">
            <label className={label}>Descripción (opcional)</label>
            <input name="descripcion" className={input} />
          </div>
          <ConfirmButton className={btn} confirmar={confirmar}>+ Agregar parámetro</ConfirmButton>
        </form>
      </section>

      {/* C. Preguntas del test → Pregunta → Respuestas → parámetro y puntos */}
      <section id="preguntas" className="space-y-4">
        <h2 className="font-semibold text-slate-900">Preguntas del test</h2>
        {dims.length === 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Primero agrega al menos un parámetro para poder asignar puntos a las respuestas.
          </p>
        )}
        {preguntas.map((q, i) => {
          const ops = opciones.filter((o) => o.question_id === q.id);
          return (
            <div key={q.id} id={`p-${q.id}`} className={`${card} space-y-4`}>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Pregunta {i + 1}{" "}
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                    {q.tipo === "escala" ? "Escala" : "Opción múltiple"}
                  </span>
                </h3>
                <form action={actualizarPregunta.bind(null, id, q.id)} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-60 flex-1">
                    <label className={label}>Texto de la pregunta</label>
                    <input name="texto" required defaultValue={q.texto} className={input} />
                  </div>
                  <div className="w-20">
                    <label className={label}>Orden</label>
                    <input name="orden" type="number" defaultValue={q.orden} className={input} />
                  </div>
                  <label className="flex items-center gap-1 pb-2 text-sm text-slate-700">
                    <input type="checkbox" name="obligatoria" defaultChecked={q.obligatoria} /> Obligatoria
                  </label>
                  <ConfirmButton className={btnGhost} confirmar={confirmar}>Guardar pregunta</ConfirmButton>
                </form>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-700">Respuestas</h4>
                {ops.length === 0 && <p className="text-sm text-slate-500">Aún no hay respuestas. Agrega al menos dos.</p>}
                {ops.map((o, j) => (
                  <div key={o.id} className="rounded-md bg-slate-50 p-3">
                    <form action={actualizarOpcion.bind(null, id, o.id, q.id)} className="space-y-2">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-48 flex-1">
                          <label className={label}>Respuesta {j + 1}</label>
                          <input name="texto" required defaultValue={o.texto} className={input} />
                        </div>
                        <div className="w-16">
                          <label className={label}>Orden</label>
                          <input name="orden" type="number" defaultValue={o.orden} className={input} />
                        </div>
                      </div>
                      {dims.length > 0 && (
                        <div>
                          <p className={label}>Parámetro que evalúa → puntos que suma esta respuesta</p>
                          <div className="flex flex-wrap gap-2">
                            {dims.map((d) => (
                              <label key={d.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm">
                                <span className="max-w-40 truncate" title={d.nombre}>{d.nombre}</span>
                                <input
                                  name={`peso_${d.id}`} type="number" step="any" aria-label={`Puntos a ${d.nombre}`}
                                  defaultValue={peso.get(`${o.id}:${d.id}`) ?? 0} className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      <ConfirmButton className={btnGhost} confirmar={confirmar}>Guardar respuesta</ConfirmButton>
                    </form>
                    <form action={eliminarOpcion.bind(null, id, o.id, q.id)} className="mt-2">
                      <ConfirmButton className="text-xs text-red-700 hover:underline" confirmar={confirmar}>Quitar esta respuesta</ConfirmButton>
                    </form>
                  </div>
                ))}

                <div className="flex flex-wrap items-end gap-2">
                  <form action={agregarOpcion.bind(null, id, q.id)} className="flex flex-1 flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1">
                      <label className={label}>Nueva respuesta</label>
                      <input name="texto" required className={input} />
                    </div>
                    <ConfirmButton className={btnGhost} confirmar={confirmar}>+ Agregar respuesta</ConfirmButton>
                  </form>
                  {q.tipo === "escala" && (
                    <form action={agregarEscalaLikert.bind(null, id, q.id)}>
                      <ConfirmButton className={btnGhost} confirmar={confirmar}>+ Escala Likert (1 a 5)</ConfirmButton>
                    </form>
                  )}
                </div>
              </div>

              <form action={eliminarPregunta.bind(null, id, q.id)}>
                <ConfirmButton className={btnDanger} confirmar={confirmar ?? "Se borrarán sus respuestas y puntos. ¿Continuar?"}>Eliminar esta pregunta</ConfirmButton>
              </form>
            </div>
          );
        })}

        <form action={agregarPregunta.bind(null, id)} className={`${card} space-y-3`}>
          <div>
            <label className={label} htmlFor="texto-nueva">Nueva pregunta</label>
            <input id="texto-nueva" name="texto" required className={input} placeholder="Escribe la pregunta y elige su tipo de respuesta" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ConfirmButton className={btn} name="tipo" value="opcion_multiple" confirmar={confirmar}>+ Pregunta de opción múltiple</ConfirmButton>
            <ConfirmButton className={btn} name="tipo" value="escala" confirmar={confirmar}>+ Pregunta de escala (Likert)</ConfirmButton>
          </div>
        </form>
      </section>

      <div className="flex justify-end">
        <Link href={`/admin/tests/${id}/resultados`} className={btn}>Continuar a resultados y publicación →</Link>
      </div>
    </div>
  );
}
