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
  if (error) redirect("/login?error=1");
  redirect("/admin");
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
