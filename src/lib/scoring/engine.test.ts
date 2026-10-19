import { describe, expect, it } from "vitest";
import { calcularResultado } from "./engine";
import { ScoringError, type Regla, type ScoringInput } from "./types";

// Test de juguete de 3 preguntas con opciones a/b/c. Cada opción lleva su peso por dimensión.
const dimensiones = [
  { id: "D1", nombre: "Autocrático" },
  { id: "D2", nombre: "Democrático" },
  { id: "D3", nombre: "Laissez-faire" },
];
const preguntas = ["Q1", "Q2", "Q3"].map((q) => ({
  id: q,
  obligatoria: true,
  opcionIds: [`${q}a`, `${q}b`, `${q}c`],
}));
// Opción a → D1, b → D2, c → D3, un punto cada una.
const pesos = preguntas.flatMap((q) =>
  [["a", "D1"], ["b", "D2"], ["c", "D3"]].map(([letra, dim]) => ({
    opcionId: `${q.id}${letra}`,
    dimensionId: dim,
    puntos: 1,
  })),
);
const regla = (r: Partial<Regla> & Pick<Regla, "id" | "titulo">): Regla => ({
  dimensionId: null, min: null, max: null, texto: null, orden: 0, ...r,
});
const contesta = (...opciones: string[]) =>
  opciones.map((o) => ({ preguntaId: o.slice(0, 2), opcionId: o }));

const base = { dimensiones, preguntas, pesos };

describe("perfil", () => {
  const reglas = [
    regla({ id: "R1", dimensionId: "D1", titulo: "Líder autocrático", texto: "Decide solo" }),
    regla({ id: "R2", dimensionId: "D2", titulo: "Líder democrático" }),
  ];
  const perfil = (respuestas: ScoringInput["respuestas"], r = reglas): ScoringInput => ({
    ...base, tipo: "perfil", reglas: r, respuestas,
  });

  it("gana la dimensión con mayor puntaje y devuelve su regla", () => {
    const res = calcularResultado(perfil(contesta("Q1b", "Q2b", "Q3a")));
    expect(res.tipo).toBe("perfil");
    if (res.tipo !== "perfil") return;
    expect(res.empate).toBe(false);
    expect(res.ganadoras).toHaveLength(1);
    expect(res.ganadoras[0]).toMatchObject({ dimensionId: "D2", puntos: 2 });
    expect(res.ganadoras[0].regla?.titulo).toBe("Líder democrático");
    expect(res.puntajes.map((p) => p.puntos)).toEqual([1, 2, 0]);
  });

  it("empate: devuelve todas las dimensiones empatadas", () => {
    const res = calcularResultado(perfil(contesta("Q1a", "Q2b", "Q3c")));
    if (res.tipo !== "perfil") throw new Error("tipo");
    expect(res.empate).toBe(true);
    expect(res.ganadoras.map((g) => g.dimensionId)).toEqual(["D1", "D2", "D3"]);
    expect(res.ganadoras[2].regla).toBeNull(); // D3 no tiene regla definida
  });

  it("sin puntos no hay ganadora", () => {
    const sinPesos = { ...perfil(contesta("Q1a", "Q2a", "Q3a")), pesos: [] };
    const res = calcularResultado(sinPesos);
    if (res.tipo !== "perfil") throw new Error("tipo");
    expect(res.ganadoras).toEqual([]);
    expect(res.empate).toBe(false);
  });

  it("una opción puede sumar a varias dimensiones", () => {
    const multi = perfil(contesta("Q1a", "Q2a", "Q3a"));
    multi.pesos = [...pesos, { opcionId: "Q1a", dimensionId: "D2", puntos: 5 }];
    const res = calcularResultado(multi);
    if (res.tipo !== "perfil") throw new Error("tipo");
    expect(res.puntajes.map((p) => p.puntos)).toEqual([3, 5, 0]);
    expect(res.ganadoras[0].dimensionId).toBe("D2");
  });

  it("respeta min/max de la regla del perfil y elige por orden", () => {
    const reglasRango = [
      regla({ id: "alto", dimensionId: "D1", min: 3, titulo: "Muy autocrático", orden: 1 }),
      regla({ id: "medio", dimensionId: "D1", min: 2, max: 2, titulo: "Autocrático", orden: 2 }),
    ];
    const res = calcularResultado(perfil(contesta("Q1a", "Q2a", "Q3b"), reglasRango));
    if (res.tipo !== "perfil") throw new Error("tipo");
    expect(res.ganadoras[0].regla?.reglaId).toBe("medio");
  });
});

describe("aptitud", () => {
  // Pesos propios: cada opción suma 0, 1 o 2 puntos a una sola competencia.
  const pesosApt = preguntas.flatMap((q) =>
    [["a", 0], ["b", 1], ["c", 2]].map(([letra, p]) => ({
      opcionId: `${q.id}${letra}`, dimensionId: "D1", puntos: p as number,
    })),
  );
  const reglas = [
    regla({ id: "bajo", titulo: "Bajo", min: 0, max: 2 }),
    regla({ id: "medio", titulo: "Medio", min: 3, max: 4 }),
    regla({ id: "alto", titulo: "Alto", min: 5 }), // sin tope
  ];
  const aptitud = (respuestas: ScoringInput["respuestas"], r = reglas): ScoringInput => ({
    tipo: "aptitud", dimensiones, preguntas, pesos: pesosApt, reglas: r, respuestas,
  });

  it.each([
    [["Q1a", "Q2a", "Q3a"], 0, "Bajo"],
    [["Q1b", "Q2b", "Q3a"], 2, "Bajo"], // borde superior inclusivo
    [["Q1b", "Q2b", "Q3b"], 3, "Medio"], // borde inferior inclusivo
    [["Q1c", "Q2c", "Q3a"], 4, "Medio"],
    [["Q1c", "Q2c", "Q3c"], 6, "Alto"],
  ])("total de %j = %d → %s", (opciones, total, titulo) => {
    const res = calcularResultado(aptitud(contesta(...opciones)));
    if (res.tipo !== "aptitud") throw new Error("tipo");
    expect(res.total).toBe(total);
    expect(res.nivel?.titulo).toBe(titulo);
  });

  it("sin regla en el rango, nivel es null", () => {
    const res = calcularResultado(aptitud(contesta("Q1c", "Q2c", "Q3c"), [reglas[0]]));
    if (res.tipo !== "aptitud") throw new Error("tipo");
    expect(res.nivel).toBeNull();
  });

  it("evalúa reglas por competencia por separado del total", () => {
    const conComp = [
      ...reglas,
      regla({ id: "c-ok", dimensionId: "D1", titulo: "Competente", min: 4 }),
    ];
    const res = calcularResultado(aptitud(contesta("Q1c", "Q2c", "Q3a"), conComp));
    if (res.tipo !== "aptitud") throw new Error("tipo");
    expect(res.porDimension).toHaveLength(1); // solo dimensiones con reglas propias
    expect(res.porDimension[0].regla?.titulo).toBe("Competente");
    expect(res.nivel?.titulo).toBe("Medio");
  });

  it("suma decimales sin error de punto flotante", () => {
    const input = aptitud(contesta("Q1b", "Q2b", "Q3b"));
    input.pesos = ["Q1b", "Q2b", "Q3b"].map((o, i) => ({
      opcionId: o, dimensionId: "D1", puntos: [0.1, 0.2, 0][i],
    }));
    const res = calcularResultado(input);
    if (res.tipo !== "aptitud") throw new Error("tipo");
    expect(res.total).toBe(0.3);
  });
});

describe("validación de respuestas", () => {
  const input = (respuestas: ScoringInput["respuestas"]): ScoringInput => ({
    ...base, tipo: "perfil", reglas: [], respuestas,
  });

  it("rechaza respuestas incompletas", () => {
    expect(() => calcularResultado(input(contesta("Q1a", "Q2a")))).toThrow(ScoringError);
  });

  it("acepta omitir preguntas no obligatorias", () => {
    const i = input(contesta("Q1a", "Q2a"));
    i.preguntas = preguntas.map((p) => (p.id === "Q3" ? { ...p, obligatoria: false } : p));
    expect(() => calcularResultado(i)).not.toThrow();
  });

  it("rechaza una opción de otra pregunta", () => {
    expect(() =>
      calcularResultado(input([...contesta("Q1a", "Q2a"), { preguntaId: "Q3", opcionId: "Q1a" }])),
    ).toThrow(/no pertenece a la pregunta/);
  });

  it("rechaza preguntas ajenas al test y respuestas duplicadas", () => {
    expect(() =>
      calcularResultado(input([...contesta("Q1a", "Q2a", "Q3a"), { preguntaId: "X", opcionId: "Xa" }])),
    ).toThrow(/no pertenece al test/);
    expect(() =>
      calcularResultado(input([...contesta("Q1a", "Q2a", "Q3a"), ...contesta("Q1b")])),
    ).toThrow(/más de una vez/);
  });
});
