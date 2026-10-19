import Link from "next/link";

const PASOS = [
  { n: 1, titulo: "Datos básicos", ruta: (id: string) => `/admin/tests/${id}/configurar#basicos` },
  { n: 2, titulo: "Clasificación y objetivo", ruta: (id: string) => `/admin/tests/${id}/configurar` },
  { n: 3, titulo: "Preguntas", ruta: (id: string) => `/admin/tests/${id}` },
  { n: 4, titulo: "Resultados y publicación", ruta: (id: string) => `/admin/tests/${id}/resultados` },
];

// Indicador de pasos del asistente. Sin `testId` (test aún no creado) los pasos no son enlaces.
export function Pasos({ actual, testId }: { actual: 1 | 2 | 3 | 4; testId?: string }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Pasos para armar el test">
      {PASOS.map((p) => {
        const estado = p.n === actual ? "actual" : p.n < actual ? "hecho" : "pendiente";
        const clases =
          estado === "actual"
            ? "bg-indigo-600 text-white"
            : estado === "hecho"
              ? "bg-indigo-100 text-indigo-800"
              : "bg-slate-100 text-slate-600";
        const contenido = (
          <>
            <span className="font-semibold">{p.n}</span> {p.titulo}
          </>
        );
        return (
          <li key={p.n}>
            {testId ? (
              <Link href={p.ruta(testId)} aria-current={estado === "actual" ? "step" : undefined} className={`inline-block rounded-full px-3 py-1 ${clases}`}>
                {contenido}
              </Link>
            ) : (
              <span className={`inline-block rounded-full px-3 py-1 ${clases}`}>{contenido}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
