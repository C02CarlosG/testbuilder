import {
  ScoringError,
  type Ganadora,
  type PuntajeDimension,
  type Regla,
  type ReglaAplicada,
  type Resultado,
  type ScoringInput,
} from "./types";

// Redondeo para evitar basura de punto flotante (0.1 + 0.2) en sumas de pesos decimales.
const redondear = (n: number) => Math.round(n * 1e6) / 1e6;

/** Rango inclusivo en ambos extremos; un límite nulo no restringe. */
function enRango(valor: number, regla: Regla): boolean {
  return (
    (regla.min === null || valor >= regla.min) &&
    (regla.max === null || valor <= regla.max)
  );
}

/** Primera regla (por `orden`, luego por id para ser determinista) que cumple el filtro y el rango. */
function buscarRegla(
  reglas: Regla[],
  dimensionId: string | null,
  valor: number,
): ReglaAplicada | null {
  const candidata = reglas
    .filter((r) => r.dimensionId === dimensionId && enRango(valor, r))
    .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))[0];
  return candidata
    ? { reglaId: candidata.id, titulo: candidata.titulo, texto: candidata.texto }
    : null;
}

/** Valida que las respuestas sean coherentes con el test. Lanza ScoringError si no. */
function validar({ preguntas, respuestas }: ScoringInput): void {
  const porPregunta = new Map(preguntas.map((p) => [p.id, p]));
  const vistas = new Set<string>();

  for (const r of respuestas) {
    const pregunta = porPregunta.get(r.preguntaId);
    if (!pregunta) throw new ScoringError(`La pregunta ${r.preguntaId} no pertenece al test`);
    if (vistas.has(r.preguntaId)) throw new ScoringError(`La pregunta ${r.preguntaId} se contestó más de una vez`);
    if (!pregunta.opcionIds.includes(r.opcionId)) {
      throw new ScoringError(`La opción ${r.opcionId} no pertenece a la pregunta ${r.preguntaId}`);
    }
    vistas.add(r.preguntaId);
  }

  const faltantes = preguntas.filter((p) => p.obligatoria && !vistas.has(p.id));
  if (faltantes.length > 0) {
    throw new ScoringError(`Faltan ${faltantes.length} pregunta(s) obligatoria(s) por contestar`);
  }
}

/** Suma, por dimensión, los pesos de las opciones elegidas. Incluye dimensiones en cero. */
function calcularPuntajes(input: ScoringInput): PuntajeDimension[] {
  const elegidas = new Set(input.respuestas.map((r) => r.opcionId));
  const acumulado = new Map(input.dimensiones.map((d) => [d.id, 0]));

  for (const peso of input.pesos) {
    if (!elegidas.has(peso.opcionId)) continue;
    if (!acumulado.has(peso.dimensionId)) {
      throw new ScoringError(`El peso apunta a una dimensión desconocida: ${peso.dimensionId}`);
    }
    acumulado.set(peso.dimensionId, acumulado.get(peso.dimensionId)! + peso.puntos);
  }

  return input.dimensiones.map((d) => ({
    dimensionId: d.id,
    nombre: d.nombre,
    puntos: redondear(acumulado.get(d.id)!),
  }));
}

/**
 * Motor genérico: respuestas → puntajes por dimensión → regla → resultado.
 * No contiene nada específico de un test; todo viene en `input`.
 *
 * - perfil: gana(n) la(s) dimensión(es) con mayor puntaje. Empate = varias ganadoras;
 *   la presentación del empate la decide quien consume el resultado.
 * - aptitud: puntaje total (suma de todas las dimensiones) contra reglas de rango → nivel,
 *   más un nivel opcional por competencia.
 */
export function calcularResultado(input: ScoringInput): Resultado {
  validar(input);
  const puntajes = calcularPuntajes(input);

  if (input.tipo === "perfil") {
    const maximo = Math.max(...puntajes.map((p) => p.puntos));
    // Si nadie sumó puntos no hay perfil que declarar.
    const ganadoras: Ganadora[] =
      puntajes.length === 0 || maximo <= 0
        ? []
        : puntajes
            .filter((p) => p.puntos === maximo)
            .map((p) => ({ ...p, regla: buscarRegla(input.reglas, p.dimensionId, p.puntos) }));
    return { tipo: "perfil", puntajes, ganadoras, empate: ganadoras.length > 1 };
  }

  const total = redondear(puntajes.reduce((suma, p) => suma + p.puntos, 0));
  return {
    tipo: "aptitud",
    puntajes,
    total,
    nivel: buscarRegla(input.reglas, null, total),
    porDimension: puntajes
      .map((p) => ({ ...p, regla: buscarRegla(input.reglas, p.dimensionId, p.puntos) }))
      .filter((p) => input.reglas.some((r) => r.dimensionId === p.dimensionId)),
  };
}
