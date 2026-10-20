// Validación de lo que manda el respondiente (entrada NO confiable). Función pura.
import type { Respuesta } from "./scoring/types";

export class EnvioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvioError";
  }
}

export interface EntradaValida {
  /** Solo los campos que el test pide, ya recortados. */
  datos: Record<string, string>;
  respuestas: Respuesta[];
}

const MAX_RESPUESTAS = 500;
const MAX_TEXTO = 300;

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Normaliza la entrada: descarta campos que el test no pidió, exige los que sí,
 * limita tamaños y exige consentimiento si el test tiene aviso de privacidad.
 * La coherencia respuestas↔preguntas la valida después el motor de puntuación.
 */
export function validarEntrada(
  raw: unknown,
  campos: string[],
  requiereConsentimiento: boolean,
): EntradaValida {
  if (!esObjeto(raw)) throw new EnvioError("Los datos enviados no son válidos.");

  if (requiereConsentimiento && raw.consentimiento !== true) {
    throw new EnvioError("Debes aceptar el aviso de privacidad para continuar.");
  }

  const datosRaw = esObjeto(raw.datos) ? raw.datos : {};
  const datos: Record<string, string> = {};
  for (const campo of campos) {
    const valor = typeof datosRaw[campo] === "string" ? datosRaw[campo].trim() : "";
    if (!valor) throw new EnvioError(`Falta el dato «${campo}».`);
    if (valor.length > MAX_TEXTO) throw new EnvioError(`El dato «${campo}» es demasiado largo.`);
    datos[campo] = valor;
  }

  if (!Array.isArray(raw.respuestas) || raw.respuestas.length > MAX_RESPUESTAS) {
    throw new EnvioError("Las respuestas enviadas no son válidas.");
  }
  const respuestas = raw.respuestas.map((r): Respuesta => {
    if (!esObjeto(r) || typeof r.preguntaId !== "string" || typeof r.opcionId !== "string") {
      throw new EnvioError("Las respuestas enviadas no son válidas.");
    }
    return { preguntaId: r.preguntaId, opcionId: r.opcionId };
  });

  return { datos, respuestas };
}
