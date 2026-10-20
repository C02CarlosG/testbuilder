import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/ConfirmButton";
import { ReporteView } from "@/components/ReporteView";
import { cargarDetalle, cargarTest, cargarUnaRespuesta } from "@/lib/reportes-datos";
import { armarReporte } from "@/lib/reportes";
import { eliminarRespuesta } from "../../../../actions";
import { btn, btnDanger } from "../../../../ui";

export const metadata = { title: "Reporte individual · TestBuilder" };

export default async function ReportePage({ params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id, rid } = await params;
  const supabase = await createClient();
  const datos = await cargarTest(supabase, id);
  const respuesta = datos && (await cargarUnaRespuesta(supabase, id, rid));
  if (!datos || !respuesta) notFound();

  const detalle = await cargarDetalle(supabase, [rid], datos.preguntas.length);
  const reporte = armarReporte(datos.info, datos.campos, respuesta, datos.preguntas, datos.opciones, detalle);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/admin/tests/${id}/respuestas`} className="text-sm text-indigo-700 hover:underline">← Todas las respuestas</Link>
        <div className="flex gap-2">
          <a href={`/admin/tests/${id}/respuestas/${rid}/pdf`} className={btn}>Descargar PDF</a>
          <form action={eliminarRespuesta.bind(null, id, rid)}>
            <ConfirmButton className={btnDanger} confirmar="Se eliminará esta respuesta y su resultado. No se puede deshacer. ¿Continuar?">Eliminar</ConfirmButton>
          </form>
        </div>
      </div>
      <ReporteView reporte={reporte} />
      <p className="text-xs text-slate-400">Datos personales: úsalos solo para los fines del aviso de privacidad.</p>
    </div>
  );
}
