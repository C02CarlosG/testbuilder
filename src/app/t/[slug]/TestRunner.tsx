"use client";

import { useState, useTransition } from "react";
import { enviarRespuestas } from "./actions";
import type { Resultado } from "@/lib/scoring/types";
import { btn, btnGhost, card, input, label } from "@/app/admin/ui";

export interface PreguntaPublica {
  id: string;
  texto: string;
  tipo: "opcion_multiple" | "escala";
  obligatoria: boolean;
  opciones: { id: string; texto: string }[];
}

interface Props {
  slug: string;
  nombre: string;
  descripcion: string | null;
  aviso: string | null;
  campos: string[];
  preguntas: PreguntaPublica[];
}

export function TestRunner({ slug, nombre, descripcion, aviso, campos, preguntas }: Props) {
  // paso 0 = datos; 1..n = preguntas; luego resultado.
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Record<string, string>>({});
  const [consentimiento, setConsentimiento] = useState(false);
  const [elegidas, setElegidas] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  if (resultado) return <ResultadoView nombre={nombre} resultado={resultado} />;

  if (preguntas.length === 0) {
    return <p className={`${card} text-sm text-slate-600`}>Este test aún no tiene preguntas.</p>;
  }

  const total = preguntas.length;
  const pregunta = paso >= 1 ? preguntas[paso - 1] : null;
  const progreso = Math.round((paso / (total + 1)) * 100);

  const datosCompletos = campos.every((c) => (datos[c] ?? "").trim() !== "") && (!aviso || consentimiento);
  const puedeAvanzar = pregunta ? !pregunta.obligatoria || Boolean(elegidas[pregunta.id]) : datosCompletos;

  function enviar() {
    setError(null);
    iniciarEnvio(async () => {
      const respuestas = Object.entries(elegidas).map(([preguntaId, opcionId]) => ({ preguntaId, opcionId }));
      const r = await enviarRespuestas(slug, { datos, consentimiento, respuestas });
      if (r.ok) setResultado(r.resultado);
      else setError(r.error);
    });
  }

  function siguiente() {
    if (paso < total) setPaso(paso + 1);
    else enviar();
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">{nombre}</h1>
        {paso === 0 && descripcion && <p className="mt-2 text-slate-600">{descripcion}</p>}
      </header>

      <div
        role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progreso}
        aria-label="Avance del test" className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progreso}%` }} />
      </div>
      <p className="text-xs text-slate-500">
        {paso === 0 ? "Tus datos" : `Pregunta ${paso} de ${total}`}
      </p>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {paso === 0 ? (
        <section className={`${card} space-y-4`}>
          {campos.map((c) => (
            <div key={c}>
              <label className={`${label} capitalize`} htmlFor={`campo-${c}`}>{c}</label>
              <input
                id={`campo-${c}`} className={input} value={datos[c] ?? ""} maxLength={300}
                onChange={(e) => setDatos({ ...datos, [c]: e.target.value })}
              />
            </div>
          ))}
          {aviso && (
            <>
              <p className="whitespace-pre-line rounded-md bg-slate-50 p-3 text-xs text-slate-600">{aviso}</p>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" className="mt-1" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} />
                He leído y acepto el aviso de privacidad.
              </label>
            </>
          )}
        </section>
      ) : (
        pregunta && (
          <fieldset className={`${card} space-y-2`}>
            <legend className="mb-2 text-lg font-medium text-slate-900">{pregunta.texto}</legend>
            {pregunta.opciones.map((o) => (
              <label
                key={o.id}
                className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm ${
                  elegidas[pregunta.id] === o.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio" name={pregunta.id} value={o.id}
                  checked={elegidas[pregunta.id] === o.id}
                  onChange={() => setElegidas({ ...elegidas, [pregunta.id]: o.id })}
                />
                {o.texto}
              </label>
            ))}
          </fieldset>
        )
      )}

      <div className="flex justify-between gap-2">
        <button type="button" className={btnGhost} disabled={paso === 0 || enviando} onClick={() => setPaso(paso - 1)}>
          Anterior
        </button>
        <button type="button" className={btn} disabled={!puedeAvanzar || enviando} onClick={siguiente}>
          {enviando ? "Enviando…" : paso === total ? "Terminar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}

function ResultadoView({ nombre, resultado }: { nombre: string; resultado: Resultado }) {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">{nombre}</p>
        <h1 className="text-2xl font-semibold text-slate-900">Tu resultado</h1>
      </header>

      {resultado.tipo === "perfil" ? (
        resultado.ganadoras.length === 0 ? (
          <p className={`${card} text-sm text-slate-600`}>No fue posible determinar un perfil con tus respuestas.</p>
        ) : (
          <>
            {resultado.empate && (
              <p className="text-sm text-slate-600">Tu resultado combina varios perfiles con el mismo puntaje:</p>
            )}
            {resultado.ganadoras.map((g) => (
              <section key={g.dimensionId} className={card}>
                <h2 className="text-lg font-semibold text-slate-900">{g.regla?.titulo ?? g.nombre}</h2>
                {g.regla?.texto && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{g.regla.texto}</p>}
              </section>
            ))}
          </>
        )
      ) : (
        <>
          <section className={card}>
            <h2 className="text-lg font-semibold text-slate-900">
              {resultado.nivel?.titulo ?? "Resultado sin nivel asignado"}
            </h2>
            {resultado.nivel?.texto && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{resultado.nivel.texto}</p>}
            <p className="mt-3 text-sm text-slate-500">Puntaje total: {resultado.total}</p>
          </section>
          {resultado.porDimension.map((d) => (
            <section key={d.dimensionId} className={card}>
              <h3 className="font-medium text-slate-900">{d.nombre}: {d.regla?.titulo ?? "—"}</h3>
              {d.regla?.texto && <p className="mt-1 text-sm text-slate-700">{d.regla.texto}</p>}
            </section>
          ))}
        </>
      )}

      <section className={card}>
        <h3 className="mb-2 text-sm font-medium text-slate-900">Puntajes</h3>
        <ul className="space-y-1 text-sm text-slate-700">
          {resultado.puntajes.map((p) => (
            <li key={p.dimensionId} className="flex justify-between"><span>{p.nombre}</span><span>{p.puntos}</span></li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-slate-500">Tus respuestas fueron enviadas. Ya puedes cerrar esta página.</p>
    </div>
  );
}
