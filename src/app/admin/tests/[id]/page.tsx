import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  actualizarDimension, actualizarOpcion, actualizarPregunta, actualizarRegla, actualizarTest,
  agregarDimension, agregarEscalaLikert, agregarOpcion, agregarPregunta, agregarRegla,
  cambiarEstado, eliminarDimension, eliminarOpcion, eliminarPregunta, eliminarRegla, eliminarTest,
} from "../../actions";
import { btn, btnDanger, btnGhost, card, input, label } from "../../ui";

export const metadata = { title: "Editar test · TestBuilder" };

export default async function EditorPage({
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

  const [dimsR, qsR, reglasR, respR] = await Promise.all([
    supabase.from("dimensions").select("*").eq("test_id", id).order("orden"),
    supabase.from("questions").select("*").eq("test_id", id).order("orden"),
    supabase.from("scoring_rules").select("*").eq("test_id", id).order("orden"),
    supabase.from("responses").select("id", { count: "exact", head: true }).eq("test_id", id),
  ]);
  const dims = dimsR.data ?? [];
  const preguntas = qsR.data ?? [];
  const reglas = reglasR.data ?? [];
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
  const etiquetaDim = test.tipo === "perfil" ? "perfil" : "competencia";
  const linkPublico = `/t/${test.slug}`;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-indigo-700 hover:underline">← Mis tests</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{test.nombre}</h1>
          <span className={`rounded-full px-2 py-1 text-xs ${test.estado === "publicado" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            {test.estado === "publicado" ? "Publicado" : "Borrador"}
          </span>
        </div>
      </div>

      {ok && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {nRespuestas > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Este test tiene {nRespuestas} respuesta(s). Se te pedirá confirmación antes de cada cambio.
        </p>
      )}

      {/* Publicación */}
      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold text-slate-900">Publicación</h2>
        {test.estado === "publicado" ? (
          <>
            <p className="text-sm text-slate-600">Link público para compartir (ruta; antepón el dominio de la aplicación):</p>
            <code className="block break-all rounded bg-slate-100 px-3 py-2 text-sm">{linkPublico}</code>
          </>
        ) : (
          <p className="text-sm text-slate-600">Solo tú ves este test hasta que lo publiques.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/tests/${id}/vista-previa`} className={btnGhost}>Vista previa</Link>
          <form action={cambiarEstado.bind(null, id, test.estado === "publicado" ? "borrador" : "publicado")}>
            <ConfirmButton className={btn} confirmar={test.estado === "publicado" ? "Al despublicar, el link dejará de funcionar. ¿Continuar?" : undefined}>
              {test.estado === "publicado" ? "Despublicar" : "Publicar"}
            </ConfirmButton>
          </form>
        </div>
      </section>

      {/* Datos del test */}
      <section className={card}>
        <h2 className="mb-3 font-semibold text-slate-900">Datos del test</h2>
        <form action={actualizarTest.bind(null, id)} className="space-y-3">
          <div>
            <label className={label} htmlFor="nombre">Nombre</label>
            <input id="nombre" name="nombre" required defaultValue={test.nombre} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="descripcion">Descripción</label>
            <textarea id="descripcion" name="descripcion" rows={2} defaultValue={test.descripcion ?? ""} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="campos">Datos que se piden a quien contesta (uno por línea)</label>
            <textarea id="campos" name="campos" rows={3} defaultValue={(test.campos_respondiente as string[]).join("\n")} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="aviso">Aviso de privacidad</label>
            <textarea id="aviso" name="aviso" rows={4} defaultValue={test.aviso_privacidad ?? ""} className={input} />
          </div>
          <p className="text-xs text-slate-500">Tipo: {test.tipo === "perfil" ? "Perfil" : "Aptitud"} (no se puede cambiar).</p>
          <ConfirmButton className={btn} confirmar={confirmar}>Guardar datos</ConfirmButton>
        </form>
      </section>

      {/* Dimensiones */}
      <section id="dimensiones" className={`${card} space-y-3`}>
        <h2 className="font-semibold text-slate-900">
          {test.tipo === "perfil" ? "Perfiles a clasificar" : "Competencias a medir"}
        </h2>
        <p className="text-sm text-slate-600">
          {test.tipo === "perfil"
            ? "Cada respuesta suma puntos a uno o más perfiles; gana el de mayor puntaje."
            : "Cada respuesta suma puntos a una o más competencias; el nivel sale del puntaje total."}
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
              <ConfirmButton className={btnDanger} confirmar={confirmar ?? "Se borrarán también los pesos y reglas de esta dimensión. ¿Continuar?"}>Eliminar</ConfirmButton>
            </form>
          </div>
        ))}
        <form action={agregarDimension.bind(null, id)} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <div className="min-w-40 flex-1">
            <label className={label}>Nuevo {etiquetaDim}</label>
            <input name="nombre" required className={input} />
          </div>
          <div className="min-w-40 flex-[2]">
            <label className={label}>Descripción (opcional)</label>
            <input name="descripcion" className={input} />
          </div>
          <ConfirmButton className={btn} confirmar={confirmar}>Agregar</ConfirmButton>
        </form>
      </section>

      {/* Preguntas */}
      <section id="preguntas" className="space-y-4">
        <h2 className="font-semibold text-slate-900">Preguntas</h2>
        {dims.length === 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Primero agrega al menos una dimensión para poder asignar pesos.
          </p>
        )}
        {preguntas.map((q, i) => {
          const ops = opciones.filter((o) => o.question_id === q.id);
          return (
            <div key={q.id} id={`p-${q.id}`} className={`${card} space-y-3`}>
              <form action={actualizarPregunta.bind(null, id, q.id)} className="flex flex-wrap items-end gap-2">
                <span className="pb-2 text-sm font-medium text-slate-500">{i + 1}.</span>
                <div className="min-w-60 flex-1">
                  <label className={label}>Pregunta ({q.tipo === "escala" ? "escala" : "opción múltiple"})</label>
                  <input name="texto" required defaultValue={q.texto} className={input} />
                </div>
                <div className="w-20">
                  <label className={label}>Orden</label>
                  <input name="orden" type="number" defaultValue={q.orden} className={input} />
                </div>
                <label className="flex items-center gap-1 pb-2 text-sm text-slate-700">
                  <input type="checkbox" name="obligatoria" defaultChecked={q.obligatoria} /> Obligatoria
                </label>
                <ConfirmButton className={btnGhost} confirmar={confirmar}>Guardar</ConfirmButton>
              </form>

              {ops.map((o) => (
                <div key={o.id} className="flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-2">
                  <form action={actualizarOpcion.bind(null, id, o.id, q.id)} className="flex flex-1 flex-wrap items-end gap-2">
                    <div className="min-w-48 flex-1">
                      <label className={label}>Opción</label>
                      <input name="texto" required defaultValue={o.texto} className={input} />
                    </div>
                    <div className="w-16">
                      <label className={label}>Orden</label>
                      <input name="orden" type="number" defaultValue={o.orden} className={input} />
                    </div>
                    {dims.map((d) => (
                      <div key={d.id} className="w-24">
                        <label className={label} title={d.nombre}>
                          <span className="block max-w-24 truncate">Pts: {d.nombre}</span>
                        </label>
                        <input name={`peso_${d.id}`} type="number" step="any" defaultValue={peso.get(`${o.id}:${d.id}`) ?? 0} className={input} />
                      </div>
                    ))}
                    <ConfirmButton className={btnGhost} confirmar={confirmar}>Guardar</ConfirmButton>
                  </form>
                  <form action={eliminarOpcion.bind(null, id, o.id, q.id)}>
                    <ConfirmButton className={btnDanger} confirmar={confirmar}>Quitar</ConfirmButton>
                  </form>
                </div>
              ))}

              <div className="flex flex-wrap items-end gap-2">
                <form action={agregarOpcion.bind(null, id, q.id)} className="flex flex-1 flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1">
                    <label className={label}>Nueva opción</label>
                    <input name="texto" required className={input} />
                  </div>
                  <ConfirmButton className={btnGhost} confirmar={confirmar}>Agregar opción</ConfirmButton>
                </form>
                {q.tipo === "escala" && (
                  <form action={agregarEscalaLikert.bind(null, id, q.id)}>
                    <ConfirmButton className={btnGhost} confirmar={confirmar}>Agregar escala Likert (5)</ConfirmButton>
                  </form>
                )}
                <form action={eliminarPregunta.bind(null, id, q.id)}>
                  <ConfirmButton className={btnDanger} confirmar={confirmar ?? "Se borrarán sus opciones y pesos. ¿Continuar?"}>Eliminar pregunta</ConfirmButton>
                </form>
              </div>
            </div>
          );
        })}
        <form action={agregarPregunta.bind(null, id)} className={`${card} flex flex-wrap items-end gap-2`}>
          <div className="min-w-60 flex-1">
            <label className={label}>Nueva pregunta</label>
            <input name="texto" required className={input} />
          </div>
          <div>
            <label className={label}>Tipo</label>
            <select name="tipo" className={input}>
              <option value="opcion_multiple">Opción múltiple</option>
              <option value="escala">Escala (Likert)</option>
            </select>
          </div>
          <ConfirmButton className={btn} confirmar={confirmar}>Agregar pregunta</ConfirmButton>
        </form>
      </section>

      {/* Reglas */}
      <section id="reglas" className={`${card} space-y-3`}>
        <h2 className="font-semibold text-slate-900">Reglas de resultado</h2>
        <p className="text-sm text-slate-600">
          {test.tipo === "perfil"
            ? "Define el texto que verá quien caiga en cada perfil. Los límites mínimo y máximo son opcionales."
            : "Define rangos de puntaje (inclusivos) y el nivel que corresponde. «Puntaje total» suma todas las competencias."}
        </p>
        {reglas.map((r) => (
          <div key={r.id} className="flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-2">
            <form action={actualizarRegla.bind(null, id, r.id)} className="flex flex-1 flex-wrap items-end gap-2">
              <ReglaCampos dims={dims} regla={r} tipo={test.tipo} />
              <ConfirmButton className={btnGhost} confirmar={confirmar}>Guardar</ConfirmButton>
            </form>
            <form action={eliminarRegla.bind(null, id, r.id)}>
              <ConfirmButton className={btnDanger} confirmar={confirmar}>Quitar</ConfirmButton>
            </form>
          </div>
        ))}
        <form action={agregarRegla.bind(null, id)} className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <ReglaCampos dims={dims} tipo={test.tipo} />
          <ConfirmButton className={btn} confirmar={confirmar}>Agregar regla</ConfirmButton>
        </form>
      </section>

      {/* Zona de peligro */}
      <section className={`${card} border-red-200`}>
        <h2 className="mb-2 font-semibold text-red-800">Eliminar test</h2>
        <form action={eliminarTest.bind(null, id)}>
          <ConfirmButton className={btnDanger} confirmar={`Se eliminará el test y sus ${nRespuestas} respuesta(s). No se puede deshacer. ¿Continuar?`}>
            Eliminar este test
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}

type Dim = { id: string; nombre: string };
type ReglaRow = {
  dimension_id: string | null; min: number | null; max: number | null;
  resultado_titulo: string; resultado_texto: string | null; orden: number;
};

// Campos compartidos por el alta y la edición de una regla.
function ReglaCampos({ dims, regla, tipo }: { dims: Dim[]; regla?: ReglaRow; tipo: "perfil" | "aptitud" }) {
  return (
    <>
      <div className="min-w-40">
        <label className={label}>Aplica a</label>
        <select name="dimension" defaultValue={regla?.dimension_id ?? "total"} className={input}>
          {tipo === "aptitud" && <option value="total">Puntaje total</option>}
          {dims.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </div>
      <div className="w-20">
        <label className={label}>Mín.</label>
        <input name="min" type="number" step="any" defaultValue={regla?.min ?? ""} className={input} />
      </div>
      <div className="w-20">
        <label className={label}>Máx.</label>
        <input name="max" type="number" step="any" defaultValue={regla?.max ?? ""} className={input} />
      </div>
      <div className="min-w-40 flex-1">
        <label className={label}>Título del resultado</label>
        <input name="titulo" required defaultValue={regla?.resultado_titulo ?? ""} className={input} />
      </div>
      <div className="min-w-48 flex-[2]">
        <label className={label}>Texto para el reporte</label>
        <input name="descripcion" defaultValue={regla?.resultado_texto ?? ""} className={input} />
      </div>
      <div className="w-16">
        <label className={label}>Orden</label>
        <input name="orden" type="number" defaultValue={regla?.orden ?? 0} className={input} />
      </div>
    </>
  );
}
