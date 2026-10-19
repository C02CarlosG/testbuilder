import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { guardarConfiguracion } from "../../../actions";
import { Pasos } from "@/components/Pasos";
import { AvisoPrivacidad } from "@/components/AvisoPrivacidad";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CAMPOS_APLICACION, CLASIFICACIONES, FORMAS_DE_CALIFICAR, RENDIMIENTOS, type Opcion } from "@/lib/catalogo";
import { btn, card, input, label } from "../../../ui";

export const metadata = { title: "Configurar test · TestBuilder" };

export default async function ConfigurarPage({
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
  const { count: nRespuestas } = await supabase.from("responses").select("id", { count: "exact", head: true }).eq("test_id", id);

  const confirmar = (nRespuestas ?? 0) > 0
    ? `Este test ya tiene ${nRespuestas} respuesta(s). Cambiar su configuración puede alterar el significado de los resultados. ¿Continuar?`
    : undefined;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">{test.nombre}</h1>
      <Pasos actual={2} testId={id} />
      {ok && <p role="status" className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>}
      {error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form action={guardarConfiguracion.bind(null, id)} className="space-y-6">
        <details id="basicos" className={card}>
          <summary className="cursor-pointer text-sm font-medium text-slate-700">Editar nombre y descripción</summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className={label} htmlFor="nombre">Nombre del test</label>
              <input id="nombre" name="nombre" required defaultValue={test.nombre} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="descripcion">Descripción</label>
              <textarea id="descripcion" name="descripcion" rows={3} defaultValue={test.descripcion ?? ""} className={input} />
            </div>
          </div>
        </details>

        <Grupo titulo="Clasificación principal" lista={CLASIFICACIONES} nombre="clasificacion" tipo="radio" actual={[test.clasificacion]} />
        {test.clasificacion === "proyectivo" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Nota: TestBuilder califica respuestas cerradas (opción múltiple o escala). En una prueba proyectiva la
            interpretación suele ser cualitativa y queda a cargo de quien evalúa.
          </p>
        )}
        <Grupo titulo="Según el tipo de rendimiento" lista={RENDIMIENTOS} nombre="rendimiento" tipo="radio" actual={[test.rendimiento]} />
        <Grupo titulo="Campos de aplicación (puedes elegir varios)" lista={CAMPOS_APLICACION} nombre="campos_aplicacion" tipo="checkbox" actual={test.campos_aplicacion} />

        <section className={`${card} space-y-2`}>
          <label className="block text-sm font-semibold text-slate-900" htmlFor="objetivo">Objetivo del test</label>
          <p className="text-sm text-slate-600">¿Qué se quiere conocer o decidir con este test? Aparecerá en el reporte.</p>
          <textarea id="objetivo" name="objetivo" rows={3} required defaultValue={test.objetivo ?? ""} className={input} />
        </section>

        <Grupo titulo="Forma de calificar" lista={FORMAS_DE_CALIFICAR} nombre="tipo" tipo="radio" actual={[test.tipo]}
          ayuda="Suele ir de la mano del rendimiento: la ejecución máxima se mide por nivel y la típica por perfil, pero puedes elegir lo que convenga." />

        <section className={card}>
          <AvisoPrivacidad valorInicial={test.aviso_privacidad ?? ""} />
        </section>

        <ConfirmButton className={btn} confirmar={confirmar}>Guardar y continuar a las preguntas</ConfirmButton>
      </form>
    </div>
  );
}

// Grupo de opciones (radio o checkbox) con su definición breve.
function Grupo({ titulo, lista, nombre, tipo, actual, ayuda }: {
  titulo: string; lista: Opcion[]; nombre: string; tipo: "radio" | "checkbox"; actual: string[]; ayuda?: string;
}) {
  return (
    <fieldset className={`${card} space-y-3`}>
      <legend className="px-1 text-sm font-semibold text-slate-900">{titulo}</legend>
      {ayuda && <p className="text-sm text-slate-600">{ayuda}</p>}
      {lista.map((o) => (
        <label key={o.valor} className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50">
          <input
            type={tipo} name={nombre} value={o.valor} defaultChecked={actual.includes(o.valor)}
            required={tipo === "radio"} className="mt-1"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">{o.titulo}</span>
            <span className="block text-sm text-slate-600">{o.definicion}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
