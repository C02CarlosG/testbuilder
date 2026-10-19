// Utilidades para leer FormData en server actions.
export const texto = (f: FormData, k: string): string => String(f.get(k) ?? "").trim();

export const textoOpcional = (f: FormData, k: string): string | null => texto(f, k) || null;

/** Número opcional; acepta coma o punto decimal. Devuelve null si está vacío o no es número. */
export function numero(f: FormData, k: string): number | null {
  const v = texto(f, k).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
