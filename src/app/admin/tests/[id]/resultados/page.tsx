import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Pasos } from "@/components/Pasos";
import { problemasParaPublicar } from "@/lib/publicable";
import { actualizarRegla, agregarRegla, cambiarEstado, eliminarRegla, eliminarTest } from "../../../actions";
import { btn, btnDanger, btnGhost, card, input, label } from "../../../ui";

export const metadata = { title: "Resultados y publicación · TestBuilder" };

// Paso 4: reglas de resultado, requisitos, vista previa y publicación.
export default async function ResultadosPage({
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
  if (!test) notFound();

  const [dimsR, reglasR, respR, pendientes] = await Promise.all([
    supabase.from("dimensions").select("id, nombre").eq("test_id", id).order("orden"),
    supabase.from("scoring_rules").select("*").eq("test_id", id).order("orden"),
    supabase.from("responses").select("id", { count: "exact", head: true }).eq("test_id", id),
    problemasParaPublicar(supabase, id),
  ]);
  const dims = dimsR.data ?? [];
  const reglas = reglasR.data ?? [];
  const nRespuestas = respR.count ?? 0;

  const confirmar = nRespuestas > 0
    ? `Este test ya tiene ${nRespuestas} respuesta(s). Cambiarlo puede alterar el significado de los resultados ya guardados. ¿Continuar?`
    : undefined;
  const publicado = test.estado === "publicado";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-indigo-700 hover:underline">← Mis tests</Link>
        <div className="mt-2 mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{test.nombre}</h1>
          <span className={`rounded-full px-2 py-1 text-xs ${publicado ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            {publicado ? "Publicado" : "Borrador"}
          </span>
        </div>
        <Pasos actual={4} testId={id} />
      </div>

      {ok && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {nRespuestas > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Este test tiene {nRespuestas} respuesta(s). Se te pedirá confirmación antes de cada cambio.
        </p>
      )}

      {/* Reglas */}
      <section id="reglas" className={`${card} space-y-3`}>
        <h2 className="font-semibold text-slate-900">Reglas de resultado</h2>
        <p className="text-sm text-slate-600">
          {test.tipo === "perfil"
            ? "Define el texto que verá quien caiga en cada perfil. Los límites mínimo y máximo son opcionales."
            : "Define rangos de puntaje (inclusivos) y el nivel que corresponde. «Puntaje total» suma todos los parámetros."}
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
          <ConfirmButton className={btn} confirmar={confirmar}>+ Agregar regla</ConfirmButton>
        </form>
      </section>

      {/* Publicación */}
      <section className={`${card} space-y-3`}>
        <h2 className="font-semibold text-slate-900">Publicación</h2>
        {pendientes.length > 0 ? (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <p className="font-medium">Antes de publicar:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">{pendientes.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        ) : (
          <p className="text-sm text-green-800">El test cumple los requisitos para publicarse.</p>
        )}
        {publicado ? (
          <>
            <p className="text-sm text-slate-600">Link público para compartir (ruta; antepón el dominio de la aplicación):</p>
            <code className="block break-all rounded bg-slate-100 px-3 py-2 text-sm">{`/t/${test.slug}`}</code>
          </>
        ) : (
          <p className="text-sm text-slate-600">Solo tú ves este test hasta que lo publiques.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/tests/${id}/vista-previa`} className={btnGhost}>Vista previa</Link>
          <form action={cambiarEstado.bind(null, id, publicado ? "borrador" : "publicado")}>
            <ConfirmButton className={btn} confirmar={publicado ? "Al despublicar, el link dejará de funcionar. ¿Continuar?" : undefined}>
              {publicado ? "Despublicar" : "Publicar"}
            </ConfirmButton>
          </form>
        </div>
      </section>

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

type ReglaRow = {
  dimension_id: string | null; min: number | null; max: number | null;
  resultado_titulo: string; resultado_texto: string | null; orden: number;
};

// Campos compartidos por el alta y la edición de una regla.
function ReglaCampos({ dims, regla, tipo }: { dims: { id: string; nombre: string }[]; regla?: ReglaRow; tipo: "perfil" | "aptitud" }) {
  return (
    <>
      <div className="min-w-40">
        <label className={label}>Aplica a</label>
        <select name="dimension" defaultValue={regla?.dimension_id ?? (tipo === "aptitud" ? "total" : dims[0]?.id)} className={input}>
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
