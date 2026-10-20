// Lógica pura de reportes y exportación: no toca la BD ni el navegador, así se prueba fácil.
import type { Resultado } from "./scoring/types";

export interface TestInfo {
  nombre: string;
  descripcion: string | null;
  objetivo: string | null;
  tipo: "perfil" | "aptitud";
}

export interface RespuestaGuardada {
  id: string;
  created_at: string;
  respondiente_nombre: string | null;
  respondiente_datos: Record<string, string>;
  resultado: Resultado | null;
}

export interface Pregunta { id: string; texto: string; orden: number }
export interface Opcion { id: string; question_id: string; texto: string }
export interface Detalle { response_id: string; question_id: string; option_id: string }

const ZONA = "America/Mexico_City";

export const formatoFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { timeZone: ZONA, dateStyle: "medium", timeStyle: "short" });

const titulo = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Texto corto del resultado, para listas y exportaciones. */
export function resumenResultado(r: Resultado | null): string {
  if (!r) return "Sin resultado";
  if (r.tipo === "perfil") {
    return r.ganadoras.length ? r.ganadoras.map((g) => g.regla?.titulo ?? g.nombre).join(" / ") : "Sin perfil";
  }
  return r.nivel?.titulo ?? "Sin nivel";
}

// ───────── Reporte individual ─────────

export interface Reporte {
  test: TestInfo;
  fecha: string;
  respondiente: { etiqueta: string; valor: string }[];
  resultado: Resultado | null;
  resumen: string;
  /** Pregunta → respuesta elegida, en el orden del test. */
  respuestas: { pregunta: string; respuesta: string }[];
}

export function armarReporte(
  test: TestInfo,
  campos: string[],
  respuesta: RespuestaGuardada,
  preguntas: Pregunta[],
  opciones: Opcion[],
  detalle: Detalle[],
): Reporte {
  const elegida = new Map(detalle.filter((d) => d.response_id === respuesta.id).map((d) => [d.question_id, d.option_id]));
  const textoOpcion = new Map(opciones.map((o) => [o.id, o.texto]));
  return {
    test,
    fecha: formatoFecha(respuesta.created_at),
    respondiente: campos.map((c) => ({ etiqueta: titulo(c), valor: respuesta.respondiente_datos[c] ?? "" })),
    resultado: respuesta.resultado,
    resumen: resumenResultado(respuesta.resultado),
    respuestas: [...preguntas].sort((a, b) => a.orden - b.orden).map((p) => ({
      pregunta: p.texto,
      respuesta: textoOpcion.get(elegida.get(p.id) ?? "") ?? "(sin responder)",
    })),
  };
}

// ───────── Exportación ─────────

export type Celda = string | number;

/**
 * Las respuestas vienen de personas sin cuenta: un texto que empiece con = + - @ se ejecutaría
 * como fórmula al abrirlo en Excel. Se antepone una comilla para que se lea como texto.
 */
export function neutralizar(valor: Celda): Celda {
  return typeof valor === "string" && /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

export interface Tabla { encabezados: string[]; filas: Celda[][] }

export function tablaExportacion(
  test: TestInfo,
  campos: string[],
  dimensiones: { id: string; nombre: string }[],
  preguntas: Pregunta[],
  opciones: Opcion[],
  respuestas: RespuestaGuardada[],
  detalle: Detalle[],
): Tabla {
  const orden = [...preguntas].sort((a, b) => a.orden - b.orden);
  const encabezados = [
    "Fecha",
    ...campos.map(titulo),
    "Resultado",
    ...(test.tipo === "aptitud" ? ["Puntaje total"] : []),
    ...dimensiones.map((d) => `Puntos: ${d.nombre}`),
    ...orden.map((p, i) => `P${i + 1}: ${p.texto}`),
  ];

  const filas = respuestas.map((r) => {
    const puntos = new Map(r.resultado?.puntajes.map((p) => [p.dimensionId, p.puntos]));
    const rep = armarReporte(test, campos, r, preguntas, opciones, detalle);
    return [
      rep.fecha,
      ...campos.map((c) => r.respondiente_datos[c] ?? ""),
      rep.resumen,
      ...(test.tipo === "aptitud" ? [r.resultado?.tipo === "aptitud" ? r.resultado.total : ""] : []),
      ...dimensiones.map((d) => puntos.get(d.id) ?? ""),
      ...rep.respuestas.map((x) => x.respuesta),
    ].map(neutralizar);
  });
  return { encabezados, filas };
}

/** CSV con BOM UTF-8 y saltos CRLF para que Excel respete acentos y ñ. */
export function aCsv({ encabezados, filas }: Tabla): string {
  const celda = (v: Celda) => {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [encabezados, ...filas].map((f) => f.map(celda).join(",")).join("\r\n") + "\r\n";
}
