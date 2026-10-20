import type { Reporte } from "@/lib/reportes";
import { card } from "@/app/admin/ui";

// Reporte individual en pantalla (la administradora lo ve y de aquí sale también el PDF).
export function ReporteView({ reporte }: { reporte: Reporte }) {
  const { test, resultado } = reporte;
  const maximo = Math.max(1, ...(resultado?.puntajes.map((p) => p.puntos) ?? [1]));

  return (
    <article className="space-y-5">
      <header className={card}>
        <p className="text-xs uppercase tracking-wide text-slate-500">Reporte individual</p>
        <h1 className="text-2xl font-semibold text-slate-900">{test.nombre}</h1>
        <p className="mt-1 text-sm text-slate-500">{reporte.fecha}</p>
        {test.objetivo && (
          <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Objetivo del test: </span>{test.objetivo}</p>
        )}
      </header>

      <section className={card}>
        <h2 className="mb-2 font-semibold text-slate-900">Datos de la persona</h2>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {reporte.respondiente.map((d) => (
            <div key={d.etiqueta} className="flex gap-2">
              <dt className="text-slate-500">{d.etiqueta}:</dt>
              <dd className="font-medium text-slate-900">{d.valor || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={card}>
        <h2 className="mb-2 font-semibold text-slate-900">Resultado</h2>
        {!resultado ? (
          <p className="text-sm text-slate-600">Esta respuesta no tiene resultado calculado.</p>
        ) : resultado.tipo === "perfil" ? (
          resultado.ganadoras.length === 0 ? (
            <p className="text-sm text-slate-600">No fue posible determinar un perfil con estas respuestas.</p>
          ) : (
            <div className="space-y-3">
              {resultado.empate && <p className="text-sm text-amber-800">Empate: la persona combina varios perfiles con el mismo puntaje.</p>}
              {resultado.ganadoras.map((g) => (
                <div key={g.dimensionId}>
                  <h3 className="text-lg font-semibold text-slate-900">{g.regla?.titulo ?? g.nombre}</h3>
                  {g.regla?.texto && <p className="whitespace-pre-line text-sm text-slate-700">{g.regla.texto}</p>}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{resultado.nivel?.titulo ?? "Sin nivel asignado"}</h3>
              {resultado.nivel?.texto && <p className="whitespace-pre-line text-sm text-slate-700">{resultado.nivel.texto}</p>}
              <p className="mt-1 text-sm text-slate-500">Puntaje total: {resultado.total}</p>
            </div>
            {resultado.porDimension.map((d) => (
              <div key={d.dimensionId} className="border-t border-slate-100 pt-2">
                <h4 className="text-sm font-medium text-slate-900">{d.nombre}: {d.regla?.titulo ?? "—"}</h4>
                {d.regla?.texto && <p className="text-sm text-slate-700">{d.regla.texto}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {resultado && (
        <section className={card}>
          <h2 className="mb-3 font-semibold text-slate-900">Puntajes por parámetro</h2>
          <ul className="space-y-2">
            {resultado.puntajes.map((p) => (
              <li key={p.dimensionId} className="text-sm">
                <div className="flex justify-between text-slate-700"><span>{p.nombre}</span><span className="font-medium">{p.puntos}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-indigo-600" style={{ width: `${Math.max(0, Math.min(100, (p.puntos / maximo) * 100))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={card}>
        <h2 className="mb-2 font-semibold text-slate-900">Respuestas</h2>
        <ol className="space-y-2 text-sm">
          {reporte.respuestas.map((r, i) => (
            <li key={i}>
              <p className="text-slate-700">{i + 1}. {r.pregunta}</p>
              <p className="pl-4 font-medium text-slate-900">→ {r.respuesta}</p>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
