import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Pasos } from "@/components/Pasos";
import { cargarRespuestas, cargarTest } from "@/lib/reportes-datos";
import { formatoFecha, resumenResultado } from "@/lib/reportes";
import { btnGhost, card } from "../../../ui";

export const metadata = { title: "Respuestas · TestBuilder" };

export default async function RespuestasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const datos = await cargarTest(supabase, id);
  if (!datos) notFound();

  const respuestas = await cargarRespuestas(supabase, id);
  const conteo = new Map<string, number>();
  respuestas.forEach((r) => {
    const k = resumenResultado(r.resultado);
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-indigo-700 hover:underline">← Mis tests</Link>
        <h1 className="mt-2 mb-4 text-xl font-semibold text-slate-900">{datos.test.nombre}</h1>
        <Pasos actual={5} testId={id} />
      </div>
      {ok && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{ok}</p>}
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className={`${card} space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Respuestas recibidas: {respuestas.length}</h2>
          {respuestas.length > 0 && (
            <div className="flex gap-2">
              <a href={`/admin/tests/${id}/exportar?formato=xlsx`} className={btnGhost}>Descargar Excel</a>
              <a href={`/admin/tests/${id}/exportar?formato=csv`} className={btnGhost}>Descargar CSV</a>
            </div>
          )}
        </div>
        {conteo.size > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm">
            {[...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <li key={k} className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-900">{k}: <strong>{n}</strong></li>
            ))}
          </ul>
        )}
      </section>

      {respuestas.length === 0 ? (
        <p className={`${card} text-sm text-slate-600`}>Todavía nadie ha contestado este test.</p>
      ) : (
        <div className={`${card} overflow-x-auto p-0`}>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Resultado</th>
                <th className="px-4 py-2"><span className="sr-only">Reporte</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {respuestas.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatoFecha(r.created_at)}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{r.respondiente_nombre ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-700">{resumenResultado(r.resultado)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/admin/tests/${id}/respuestas/${r.id}`} className="text-indigo-700 hover:underline">Ver reporte</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
