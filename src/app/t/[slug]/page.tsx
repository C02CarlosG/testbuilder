import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TestRunner, type PreguntaPublica } from "./TestRunner";

// El público no debe indexar los tests (links privados compartidos por la administradora).
export const metadata: Metadata = { title: "Test · TestBuilder", robots: { index: false, follow: false } };

export default async function TestPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Filtro explícito por estado: si la dueña abre su link con sesión, RLS le dejaría ver borradores.
  const { data: test } = await supabase
    .from("tests")
    .select("id, nombre, descripcion, aviso_privacidad, campos_respondiente")
    .eq("slug", slug)
    .eq("estado", "publicado")
    .maybeSingle();
  if (!test) notFound();

  const { data: qs } = await supabase
    .from("questions").select("id, texto, tipo, obligatoria").eq("test_id", test.id).order("orden");
  const ids = (qs ?? []).map((q) => q.id);
  const { data: ops } = ids.length
    ? await supabase.from("answer_options").select("id, question_id, texto").in("question_id", ids).order("orden")
    : { data: [] };

  const preguntas: PreguntaPublica[] = (qs ?? []).map((q) => ({
    id: q.id,
    texto: q.texto,
    tipo: q.tipo,
    obligatoria: q.obligatoria,
    opciones: (ops ?? []).filter((o) => o.question_id === q.id).map((o) => ({ id: o.id, texto: o.texto })),
  }));

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 py-8">
      <TestRunner
        slug={slug}
        nombre={test.nombre}
        descripcion={test.descripcion}
        aviso={test.aviso_privacidad}
        campos={test.campos_respondiente as string[]}
        preguntas={preguntas}
      />
    </main>
  );
}
