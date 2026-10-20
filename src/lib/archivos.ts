/** Nombre de archivo seguro: sin acentos ni caracteres raros, para usar en Content-Disposition. */
export function nombreArchivo(texto: string): string {
  return (
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "archivo"
  );
}
