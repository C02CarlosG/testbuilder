import Link from "next/link";
import { crearTest } from "../../actions";
import { Pasos } from "@/components/Pasos";
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
      <h1 className="mb-4 text-xl font-semibold text-slate-900">Nuevo test</h1>
      <Pasos actual={1} />
      <form action={crearTest} className={`${card} max-w-xl space-y-4`}>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label className={label} htmlFor="nombre">Nombre del test</label>
          <input id="nombre" name="nombre" required className={input} />
        </div>
        <div>
          <label className={label} htmlFor="descripcion">Descripción</label>
          <textarea id="descripcion" name="descripcion" rows={4} className={input} placeholder="Breve descripción de lo que contiene el test." />
        </div>
        <div className="flex gap-2">
          <button type="submit" className={btn}>Continuar</button>
          <Link href="/admin" className={btnGhost}>Cancelar</Link>
        </div>
      </form>
    </>
  );
}
