import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { cargarDetalle, cargarRespuestas, cargarTest } from "@/lib/reportes-datos";
import { aCsv, tablaExportacion } from "@/lib/reportes";
import { nombreArchivo } from "@/lib/archivos";

// Exporta todas las respuestas del test: ?formato=xlsx (por defecto) o ?formato=csv
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const formato = new URL(req.url).searchParams.get("formato") === "csv" ? "csv" : "xlsx";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const datos = await cargarTest(supabase, id);
  if (!datos) return new Response("No encontrado", { status: 404 });

  const respuestas = await cargarRespuestas(supabase, id);
  const detalle = await cargarDetalle(supabase, respuestas.map((r) => r.id), datos.preguntas.length);
  const tabla = tablaExportacion(datos.info, datos.campos, datos.dims, datos.preguntas, datos.opciones, respuestas, detalle);
  const base = nombreArchivo(`resultados-${datos.test.nombre}`);

  if (formato === "csv") {
    return new Response(aCsv(tabla), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const libro = new ExcelJS.Workbook();
  libro.creator = "TestBuilder";
  const hoja = libro.addWorksheet("Resultados", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.addRow(tabla.encabezados);
  tabla.filas.forEach((f) => hoja.addRow(f));
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  hoja.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
  hoja.columns.forEach((col, i) => {
    const mayor = Math.max(String(tabla.encabezados[i] ?? "").length, ...tabla.filas.map((f) => String(f[i] ?? "").length));
    col.width = Math.min(50, Math.max(12, mayor + 2));
  });
  const buffer = await libro.xlsx.writeBuffer();

  return new Response(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
