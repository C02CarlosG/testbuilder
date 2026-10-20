"use client";

import { useState } from "react";
import { CONSEJOS_AVISO, PLANTILLA_AVISO } from "@/lib/catalogo";
import { btnGhost, input, label } from "@/app/admin/ui";

// Campo de aviso de privacidad con consejos de redacción y una plantilla que se puede insertar.
export function AvisoPrivacidad({ valorInicial }: { valorInicial: string }) {
  const [texto, setTexto] = useState(valorInicial);

  function usarPlantilla() {
    if (texto.trim() && !window.confirm("Se reemplazará el texto actual por la plantilla. ¿Continuar?")) return;
    setTexto(PLANTILLA_AVISO);
  }

  return (
    <div className="space-y-2">
      <label className={label} htmlFor="aviso">Aviso de privacidad</label>
      <details className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        <summary className="cursor-pointer font-medium">¿Cómo redactarlo? Sugerencias</summary>
        <p className="mt-2">Un buen aviso de privacidad debería explicar:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {CONSEJOS_AVISO.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </details>
      <textarea
        id="aviso" name="aviso" rows={8} value={texto} onChange={(e) => setTexto(e.target.value)}
        className={input} placeholder="Escribe aquí el aviso que verá quien conteste, o usa la plantilla."
      />
      <button type="button" onClick={usarPlantilla} className={btnGhost}>Usar plantilla sugerida</button>
      <p className="text-xs text-slate-500">
        Si lo dejas vacío, no se pedirá aceptación. Con datos de salud o resultados psicológicos conviene siempre incluirlo.
      </p>
    </div>
  );
}
