import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/login/actions";
import { btnGhost } from "./ui";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Segunda barrera además del proxy: sin usuario verificado no se renderiza nada.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold text-slate-900">TestBuilder</Link>
          <form action={cerrarSesion} className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
            <button type="submit" className={btnGhost}>Cerrar sesión</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
