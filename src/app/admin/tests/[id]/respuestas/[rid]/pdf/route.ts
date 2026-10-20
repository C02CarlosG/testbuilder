import { createClient } from "@/lib/supabase/server";
import { cargarDetalle, cargarTest, cargarUnaRespuesta } from "@/lib/reportes-datos";
import { armarReporte } from "@/lib/reportes";
import { generarPdf } from "@/lib/pdf";
import { nombreArchivo } from "@/lib/archivos";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id, rid } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const datos = await cargarTest(supabase, id);
  const respuesta = datos && (await cargarUnaRespuesta(supabase, id, rid));
  if (!datos || !respuesta) return new Response("No encontrado", { status: 404 });

  const detalle = await cargarDetalle(supabase, [rid], datos.preguntas.length);
  const reporte = armarReporte(datos.info, datos.campos, respuesta, datos.preguntas, datos.opciones, detalle);
  const pdf = await generarPdf(reporte);

  const quien = respuesta.respondiente_nombre ?? "respuesta";
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo(`reporte-${datos.test.nombre}-${quien}`)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
