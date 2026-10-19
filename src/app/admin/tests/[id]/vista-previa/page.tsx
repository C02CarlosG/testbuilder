import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { card } from "../../../ui";

export const metadata = { title: "Vista previa · TestBuilder" };

// Muestra el test como lo verá quien contesta. No guarda nada ni calcula resultados.
export default async function VistaPreviaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: test } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
  if (!test) notFound();

  const { data: preguntas } = await supabase.from("questions").select("*").eq("test_id", id).order("orden");
  const ids = (preguntas ?? []).map((q) => q.id);
  const { data: opciones } = ids.length
    ? await supabase.from("answer_options").select("*").in("question_id", ids).order("orden")
    : { data: [] };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href={`/admin/tests/${id}`} className="text-sm text-indigo-700 hover:underline">← Volver al editor</Link>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Vista previa · no se guardan respuestas</span>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">{test.nombre}</h1>
      {test.descripcion && <p className="text-slate-600">{test.descripcion}</p>}

      <section className={`${card} space-y-3`}>
        <h2 className="font-medium text-slate-900">Tus datos</h2>
        {(test.campos_respondiente as string[]).map((c) => (
          <div key={c}>
            <label className="mb-1 block text-xs font-medium capitalize text-slate-600">{c}</label>
            <input disabled className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" />
          </div>
        ))}
        {test.aviso_privacidad && (
          <p className="whitespace-pre-line rounded-md bg-slate-50 p-3 text-xs text-slate-600">{test.aviso_privacidad}</p>
        )}
      </section>

      {(preguntas ?? []).map((q, i) => (
        <fieldset key={q.id} className={`${card} space-y-2`}>
          <legend className="font-medium text-slate-900">
            {i + 1}. {q.texto}{q.obligatoria && <span className="text-red-600"> *</span>}
          </legend>
          {(opciones ?? []).filter((o) => o.question_id === q.id).map((o) => (
            <label key={o.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" name={q.id} disabled /> {o.texto}
            </label>
          ))}
        </fieldset>
      ))}
      {!preguntas?.length && <p className="text-sm text-slate-600">Este test aún no tiene preguntas.</p>}
    </div>
  );
}
