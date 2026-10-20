// Tipos del motor de puntuación. Reflejan las tablas de la BD pero no dependen de ella:
// el servidor carga los datos del test y se los pasa al motor ya armados.

export type TestTipo = "perfil" | "aptitud";

export interface Dimension {
  id: string;
  nombre: string;
}

export interface Pregunta {
  id: string;
  obligatoria: boolean;
  /** Ids de las opciones que pertenecen a esta pregunta. */
  opcionIds: string[];
}

/** Puntos que una opción suma a una dimensión (tabla option_weights). */
export interface Peso {
  opcionId: string;
  dimensionId: string;
  puntos: number;
}

/** Regla de resultado (tabla scoring_rules). min/max nulos = sin límite en ese lado. */
export interface Regla {
  id: string;
  /** null = aplica al puntaje total (aptitud). */
  dimensionId: string | null;
  min: number | null;
  max: number | null;
  titulo: string;
  texto: string | null;
  orden: number;
}

export interface Respuesta {
  preguntaId: string;
  opcionId: string;
}

export interface ScoringInput {
  tipo: TestTipo;
  dimensiones: Dimension[];
  preguntas: Pregunta[];
  pesos: Peso[];
  reglas: Regla[];
  respuestas: Respuesta[];
}

export interface ReglaAplicada {
  reglaId: string;
  titulo: string;
  texto: string | null;
}

export interface PuntajeDimension {
  dimensionId: string;
  nombre: string;
  puntos: number;
}

export interface Ganadora extends PuntajeDimension {
  regla: ReglaAplicada | null;
}

export interface ResultadoPerfil {
  tipo: "perfil";
  puntajes: PuntajeDimension[];
  /** Dimensiones con el puntaje más alto. Más de una = empate. Vacío si nadie puntuó. */
  ganadoras: Ganadora[];
  empate: boolean;
}

export interface ResultadoAptitud {
  tipo: "aptitud";
  puntajes: PuntajeDimension[];
  total: number;
  /** Regla de puntaje total (dimensionId null) que cae en el rango; null si ninguna. */
  nivel: ReglaAplicada | null;
  /** Regla por competencia (reglas con dimensionId); regla null si ninguna aplica. */
  porDimension: Ganadora[];
}

export type Resultado = ResultadoPerfil | ResultadoAptitud;

/** Error de datos inválidos (respuesta incompleta, opción ajena, etc.). */
export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringError";
  }
}
