import Link from "next/link";
import { crearTest } from "../../actions";
import { btn, btnGhost, card, input, label } from "../../ui";

export const metadata = { title: "Nuevo test · TestBuilder" };

export default async function NuevoTestPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">Nuevo test</h1>
      <form action={crearTest} className={`${card} max-w-xl space-y-4`}>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className={label} htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="descripcion">Descripción (opcional)</label>
          <textarea id="descripcion" name="descripcion" rows={3} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="tipo">Tipo de test</label>
          <select id="tipo" name="tipo" className={input} defaultValue="perfil">
            <option value="perfil">Perfil: clasifica a la persona en un perfil</option>
            <option value="aptitud">Aptitud: mide un nivel según el puntaje total</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="campos">Datos que se piden a quien contesta (uno por línea)</label>
          <textarea id="campos" name="campos" rows={3} defaultValue={"nombre"} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="aviso">Aviso de privacidad (opcional)</label>
          <textarea id="aviso" name="aviso" rows={4} className={input} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className={btn}>Crear y continuar</button>
          <Link href="/admin" className={btnGhost}>Cancelar</Link>
        </div>
      </form>
    </>
  );
}
