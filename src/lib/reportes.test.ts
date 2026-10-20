import { describe, expect, it } from "vitest";
import { aCsv, armarReporte, neutralizar, resumenResultado, tablaExportacion, type RespuestaGuardada, type TestInfo } from "./reportes";
import type { Resultado } from "./scoring/types";

const perfil: Resultado = {
  tipo: "perfil", empate: false,
  puntajes: [{ dimensionId: "D1", nombre: "Autocrático", puntos: 3 }, { dimensionId: "D2", nombre: "Democrático", puntos: 1 }],
  ganadoras: [{ dimensionId: "D1", nombre: "Autocrático", puntos: 3, regla: { reglaId: "R1", titulo: "Líder autocrático", texto: null } }],
};
const aptitud: Resultado = {
  tipo: "aptitud", total: 7, nivel: { reglaId: "R2", titulo: "Alto", texto: null }, porDimension: [],
  puntajes: [{ dimensionId: "D1", nombre: "Lógica", puntos: 7 }],
};

const test: TestInfo = { nombre: "T", descripcion: null, objetivo: "Obj", tipo: "perfil" };
const resp = (id: string, extra: Partial<RespuestaGuardada> = {}): RespuestaGuardada => ({
  id, created_at: "2026-10-19T18:00:00Z", respondiente_nombre: "Ana",
  respondiente_datos: { nombre: "Ana", puesto: "Jefa" }, resultado: perfil, ...extra,
});
const preguntas = [{ id: "Q2", texto: "Segunda", orden: 2 }, { id: "Q1", texto: "Primera", orden: 1 }];
const opciones = [{ id: "O1", question_id: "Q1", texto: "Sí" }, { id: "O2", question_id: "Q2", texto: "No" }];
const detalle = [
  { response_id: "A", question_id: "Q1", option_id: "O1" },
  { response_id: "A", question_id: "Q2", option_id: "O2" },
  { response_id: "B", question_id: "Q1", option_id: "O1" },
];

describe("resumenResultado", () => {
  it("perfil, empate, sin ganador y aptitud", () => {
    expect(resumenResultado(perfil)).toBe("Líder autocrático");
    expect(resumenResultado({ ...perfil, empate: true, ganadoras: [...perfil.ganadoras, { dimensionId: "D2", nombre: "Democrático", puntos: 3, regla: null }] } as Resultado))
      .toBe("Líder autocrático / Democrático");
    expect(resumenResultado({ ...perfil, ganadoras: [] } as Resultado)).toBe("Sin perfil");
    expect(resumenResultado(aptitud)).toBe("Alto");
    expect(resumenResultado(null)).toBe("Sin resultado");
  });
});

describe("armarReporte", () => {
  it("ordena preguntas por `orden` y marca las sin responder", () => {
    const r = armarReporte(test, ["nombre", "puesto"], resp("B"), preguntas, opciones, detalle);
    expect(r.respondiente).toEqual([{ etiqueta: "Nombre", valor: "Ana" }, { etiqueta: "Puesto", valor: "Jefa" }]);
    expect(r.respuestas).toEqual([
      { pregunta: "Primera", respuesta: "Sí" },
      { pregunta: "Segunda", respuesta: "(sin responder)" },
    ]);
    expect(r.resumen).toBe("Líder autocrático");
  });
});

describe("tablaExportacion y CSV", () => {
  const dims = [{ id: "D1", nombre: "Autocrático" }, { id: "D2", nombre: "Democrático" }];
  const tabla = tablaExportacion(test, ["nombre", "puesto"], dims, preguntas, opciones, [resp("A")], detalle);

  it("arma encabezados y una fila por respuesta", () => {
    expect(tabla.encabezados).toEqual([
      "Fecha", "Nombre", "Puesto", "Resultado", "Puntos: Autocrático", "Puntos: Democrático", "P1: Primera", "P2: Segunda",
    ]);
    expect(tabla.filas).toHaveLength(1);
    expect(tabla.filas[0].slice(1)).toEqual(["Ana", "Jefa", "Líder autocrático", 3, 1, "Sí", "No"]);
  });

  it("en aptitud agrega el puntaje total", () => {
    const t = tablaExportacion({ ...test, tipo: "aptitud" }, ["nombre"], dims, preguntas, opciones, [resp("A", { resultado: aptitud })], detalle);
    expect(t.encabezados).toContain("Puntaje total");
    expect(t.filas[0]).toContain(7);
  });

  it("neutraliza fórmulas escritas por quien contesta", () => {
    expect(neutralizar("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(neutralizar("+52 951 123")).toBe("'+52 951 123");
    expect(neutralizar("Ana")).toBe("Ana");
    expect(neutralizar(5)).toBe(5);
    const t = tablaExportacion(test, ["nombre"], dims, preguntas, opciones, [resp("A", { respondiente_datos: { nombre: "=1+1" } })], detalle);
    expect(t.filas[0][1]).toBe("'=1+1");
  });

  it("CSV: BOM, comillas y comas escapadas", () => {
    const csv = aCsv({ encabezados: ["a", "b"], filas: [["x, y", 'di "hola"'], ["ñandú", 2]] });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"x, y","di ""hola"""');
    expect(csv).toContain("ñandú,2");
    expect(csv.split("\r\n")).toHaveLength(4); // encabezado + 2 filas + línea final vacía
  });
});
