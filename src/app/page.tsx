import { redirect } from "next/navigation";

// La raíz solo lleva al panel; el proxy manda a /login si no hay sesión.
export default function Home() {
  redirect("/admin");
}
