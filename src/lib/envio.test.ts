import { describe, expect, it } from "vitest";
import { EnvioError, validarEntrada } from "./envio";

const ok = { datos: { nombre: "  Ana  ", puesto: "Jefa" }, consentimiento: true, respuestas: [{ preguntaId: "q1", opcionId: "o1" }] };

describe("validarEntrada", () => {
  it("recorta datos y descarta campos que el test no pidió", () => {
    const r = validarEntrada({ ...ok, datos: { ...ok.datos, extra: "x" } }, ["nombre", "puesto"], true);
    expect(r.datos).toEqual({ nombre: "Ana", puesto: "Jefa" });
    expect(r.respuestas).toEqual([{ preguntaId: "q1", opcionId: "o1" }]);
  });

  it("exige cada campo solicitado", () => {
    expect(() => validarEntrada({ ...ok, datos: { nombre: "Ana" } }, ["nombre", "puesto"], true)).toThrow(/puesto/);
    expect(() => validarEntrada({ ...ok, datos: { nombre: "   ", puesto: "x" } }, ["nombre", "puesto"], true)).toThrow(EnvioError);
  });

  it("exige consentimiento solo cuando hay aviso de privacidad", () => {
    expect(() => validarEntrada({ ...ok, consentimiento: false }, ["nombre"], true)).toThrow(/aviso de privacidad/);
    expect(() => validarEntrada({ ...ok, consentimiento: false }, ["nombre"], false)).not.toThrow();
  });

  it("rechaza formas inválidas y tamaños excesivos", () => {
    expect(() => validarEntrada(null, ["nombre"], false)).toThrow(EnvioError);
    expect(() => validarEntrada({ ...ok, respuestas: "x" }, ["nombre"], false)).toThrow(EnvioError);
    expect(() => validarEntrada({ ...ok, respuestas: [{ preguntaId: 1, opcionId: "o" }] }, ["nombre"], false)).toThrow(EnvioError);
    expect(() => validarEntrada({ ...ok, datos: { nombre: "a".repeat(301) } }, ["nombre"], false)).toThrow(/largo/);
    expect(() => validarEntrada({ ...ok, respuestas: Array(501).fill(ok.respuestas[0]) }, ["nombre"], false)).toThrow(EnvioError);
  });
});
