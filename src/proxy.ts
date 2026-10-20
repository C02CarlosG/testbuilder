import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Solo las rutas con sesión; el formulario público (/t/...) no la necesita.
  matcher: ["/admin/:path*", "/login"],
};
