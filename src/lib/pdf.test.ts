import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generarPdf } from "./pdf";
import type { Reporte } from "./reportes";

const base: Reporte = {
  test: { nombre: "Liderazgo", descripcion: null, objetivo: "Conocer el estilo de liderazgo", tipo: "perfil" },
  fecha: "19 oct 2026, 9:01 p.m.",
  respondiente: [{ etiqueta: "Nombre", valor: "María Ñandú" }],
  resumen: "Líder democrático",
  resultado: {
    tipo: "perfil", empate: false,
    puntajes: [{ dimensionId: "D1", nombre: "Democrático", puntos: 3 }],
    ganadoras: [{ dimensionId: "D1", nombre: "Democrático", puntos: 3, regla: { reglaId: "R", titulo: "Líder democrático", texto: "Busca consenso." } }],
  },
  respuestas: [{ pregunta: "¿Cómo decides?", respuesta: "Consulto" }],
};

const paginas = async (r: Reporte) => (await PDFDocument.load(await generarPdf(r))).getPageCount();

describe("generarPdf", () => {
  it("genera un PDF válido de una página", async () => {
    expect(await paginas(base)).toBe(1);
  });

  it("pagina cuando hay muchas preguntas", async () => {
    const muchas = Array.from({ length: 80 }, (_, i) => ({ pregunta: `Pregunta número ${i + 1} con un texto razonablemente largo`, respuesta: "Una respuesta" }));
    expect(await paginas({ ...base, respuestas: muchas })).toBeGreaterThan(1);
  });

  it("no falla con emojis, palabras larguísimas ni saltos de línea", async () => {
    const raro = "😀 " + "a".repeat(400) + "\nsegunda línea\ttabulada";
    await expect(generarPdf({ ...base, respondiente: [{ etiqueta: "Nombre", valor: raro }], respuestas: [{ pregunta: raro, respuesta: raro }] })).resolves.toBeInstanceOf(Uint8Array);
  });

  it("soporta resultado de aptitud y sin resultado", async () => {
    const apt: Reporte = {
      ...base, test: { ...base.test, tipo: "aptitud" },
      resultado: { tipo: "aptitud", total: 7, nivel: { reglaId: "N", titulo: "Alto", texto: "Buen nivel" }, porDimension: [], puntajes: [{ dimensionId: "D1", nombre: "Lógica", puntos: 7 }] },
    };
    expect(await paginas(apt)).toBe(1);
    expect(await paginas({ ...base, resultado: null })).toBe(1);
  });
});
