"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { texto } from "@/lib/form";

export async function iniciarSesion(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: texto(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });
  if (error) {
    // Solo las credenciales malas se reportan como tales; lo demás (red, llaves, proyecto
    // equivocado) es un problema de configuración y se distingue para poder diagnosticarlo.
    console.error("Fallo al iniciar sesión:", error.code ?? error.name, error.message);
    redirect(error.code === "invalid_credentials" ? "/login?error=1" : "/login?error=2");
  }
  redirect("/admin");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
