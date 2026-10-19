import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { btn, card } from "./ui";

export const metadata = { title: "Mis tests · TestBuilder" };

export default async function AdminPage() {
  const supabase = await createClient();
  // RLS ya limita a los tests de la usuaria; no hace falta filtrar por owner.
  const { data: tests } = await supabase
    .from("tests")
    .select("id, nombre, tipo, estado, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Mis tests</h1>
        <Link href="/admin/tests/new" className={btn}>Nuevo test</Link>
      </div>
      {!tests?.length ? (
        <p className={`${card} text-sm text-slate-600`}>
          Aún no tienes tests. Crea el primero con «Nuevo test».
        </p>
      ) : (
        <ul className="space-y-3">
          {tests.map((t) => (
            <li key={t.id}>
              <Link href={`/admin/tests/${t.id}`} className={`${card} flex items-center justify-between hover:border-indigo-300`}>
                <span className="font-medium text-slate-900">{t.nombre}</span>
                <span className="flex gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                    {t.tipo === "perfil" ? "Perfil" : "Aptitud"}
                  </span>
                  <span className={`rounded-full px-2 py-1 ${t.estado === "publicado" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {t.estado === "publicado" ? "Publicado" : "Borrador"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
