// Genera el PDF del reporte individual con pdf-lib (JavaScript puro, sin archivos de fuentes).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Reporte } from "./reportes";

const A4: [number, number] = [595.28, 841.89];
const MARGEN = 50;
const INDIGO = rgb(0.31, 0.27, 0.9);
const GRIS = rgb(0.4, 0.45, 0.52);
const TEXTO = rgb(0.06, 0.09, 0.16);

export async function generarPdf(reporte: Reporte): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  // Helvetica estándar cubre acentos y ñ (WinAnsi); lo demás (emojis, etc.) se sustituye por «?».
  const soportados = new Set(normal.getCharacterSet());
  const limpiar = (t: string) =>
    [...t.replace(/\t/g, " ").replace(/\r?\n/g, " ")].map((c) => (soportados.has(c.codePointAt(0)!) ? c : "?")).join("");

  const ancho = A4[0] - MARGEN * 2;
  let page: PDFPage = pdf.addPage(A4);
  let y = A4[1] - MARGEN;

  const asegurar = (alto: number) => {
    if (y - alto < MARGEN + 20) {
      page = pdf.addPage(A4);
      y = A4[1] - MARGEN;
    }
  };

  function lineas(texto: string, fuente: PDFFont, tam: number, maxAncho: number): string[] {
    const salida: string[] = [];
    // Respeta saltos de línea del texto original.
    for (const parrafo of texto.split(/\r?\n/)) {
      let actual = "";
      for (const palabra of limpiar(parrafo).split(" ")) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (fuente.widthOfTextAtSize(prueba, tam) <= maxAncho) {
          actual = prueba;
          continue;
        }
        if (actual) salida.push(actual);
        // Palabra más larga que la línea: se parte por caracteres.
        let resto = palabra;
        while (fuente.widthOfTextAtSize(resto, tam) > maxAncho) {
          let corte = resto.length;
          while (corte > 1 && fuente.widthOfTextAtSize(resto.slice(0, corte), tam) > maxAncho) corte--;
          salida.push(resto.slice(0, corte));
          resto = resto.slice(corte);
        }
        actual = resto;
      }
      salida.push(actual);
    }
    return salida;
  }

  function texto(t: string, opts: { tam?: number; bold?: boolean; color?: ReturnType<typeof rgb>; sangria?: number; espacio?: number } = {}) {
    const { tam = 10, bold = false, color = TEXTO, sangria = 0, espacio = 4 } = opts;
    const fuente = bold ? negrita : normal;
    for (const l of lineas(t, fuente, tam, ancho - sangria)) {
      asegurar(tam * 1.4);
      page.drawText(l, { x: MARGEN + sangria, y: y - tam, size: tam, font: fuente, color });
      y -= tam * 1.4;
    }
    y -= espacio;
  }

  const seccion = (titulo: string) => {
    asegurar(40);
    y -= 8;
    texto(titulo, { tam: 13, bold: true, color: INDIGO, espacio: 2 });
    page.drawLine({ start: { x: MARGEN, y: y + 2 }, end: { x: MARGEN + ancho, y: y + 2 }, thickness: 0.5, color: rgb(0.85, 0.87, 0.9) });
    y -= 6;
  };

  // ───── Encabezado ─────
  texto("REPORTE INDIVIDUAL", { tam: 9, color: GRIS, espacio: 2 });
  texto(reporte.test.nombre, { tam: 20, bold: true, espacio: 2 });
  texto(reporte.fecha, { tam: 10, color: GRIS });
  if (reporte.test.objetivo) texto(`Objetivo del test: ${reporte.test.objetivo}`, { tam: 10 });

  // ───── Datos de la persona ─────
  seccion("Datos de la persona");
  for (const d of reporte.respondiente) texto(`${d.etiqueta}: ${d.valor || "—"}`, { espacio: 2 });

  // ───── Resultado ─────
  seccion("Resultado");
  const r = reporte.resultado;
  if (!r) {
    texto("Esta respuesta no tiene resultado calculado.");
  } else if (r.tipo === "perfil") {
    if (r.ganadoras.length === 0) texto("No fue posible determinar un perfil con estas respuestas.");
    if (r.empate) texto("Empate: la persona combina varios perfiles con el mismo puntaje.", { color: GRIS });
    for (const g of r.ganadoras) {
      texto(g.regla?.titulo ?? g.nombre, { tam: 13, bold: true, espacio: 2 });
      if (g.regla?.texto) texto(g.regla.texto);
    }
  } else {
    texto(r.nivel?.titulo ?? "Sin nivel asignado", { tam: 13, bold: true, espacio: 2 });
    if (r.nivel?.texto) texto(r.nivel.texto);
    texto(`Puntaje total: ${r.total}`, { color: GRIS });
    for (const d of r.porDimension) {
      texto(`${d.nombre}: ${d.regla?.titulo ?? "—"}`, { bold: true, espacio: 1 });
      if (d.regla?.texto) texto(d.regla.texto, { sangria: 10 });
    }
  }

  // ───── Puntajes ─────
  if (r) {
    seccion("Puntajes por parámetro");
    const maximo = Math.max(1, ...r.puntajes.map((p) => p.puntos));
    for (const p of r.puntajes) {
      asegurar(30);
      texto(`${p.nombre}: ${p.puntos}`, { espacio: 1 });
      page.drawRectangle({ x: MARGEN, y: y - 6, width: ancho, height: 6, color: rgb(0.93, 0.94, 0.96) });
      page.drawRectangle({ x: MARGEN, y: y - 6, width: Math.max(0, Math.min(1, p.puntos / maximo)) * ancho, height: 6, color: INDIGO });
      y -= 16;
    }
  }

  // ───── Respuestas ─────
  seccion("Respuestas");
  reporte.respuestas.forEach((x, i) => {
    texto(`${i + 1}. ${x.pregunta}`, { espacio: 1 });
    texto(`Respuesta: ${x.respuesta}`, { bold: true, sangria: 12, espacio: 5 });
  });

  // ───── Pie con paginación ─────
  const paginas = pdf.getPages();
  paginas.forEach((pg, i) => {
    pg.drawText(limpiar(`${reporte.test.nombre} · Generado con TestBuilder · Página ${i + 1} de ${paginas.length}`), {
      x: MARGEN, y: 28, size: 8, font: normal, color: GRIS,
    });
  });
  return pdf.save();
}
