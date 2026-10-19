import { iniciarSesion } from "./actions";
import { btn, card, input, label } from "@/app/admin/ui";

export const metadata = { title: "Iniciar sesión · TestBuilder" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">TestBuilder</h1>
      <form action={iniciarSesion} className={`${card} space-y-4`}>
        <p className="text-sm text-slate-600">Acceso para administradoras.</p>
        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            Correo o contraseña incorrectos.
          </p>
        )}
        <div>
          <label className={label} htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className={input} />
        </div>
        <button type="submit" className={`${btn} w-full`}>Entrar</button>
      </form>
    </main>
  );
}
