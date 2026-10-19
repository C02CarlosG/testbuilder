// Tipos de la BD (generados con Supabase MCP, recortados). Regenerar si cambia el esquema.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Tbl<Row, Insert, Update> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      tests: Tbl<
        {
          id: string; owner_id: string; nombre: string; descripcion: string | null;
          tipo: "perfil" | "aptitud"; estado: "borrador" | "publicado"; slug: string;
          aviso_privacidad: string | null; campos_respondiente: Json;
          clasificacion: "psicometrico" | "proyectivo";
          rendimiento: "ejecucion_maxima" | "ejecucion_tipica";
          campos_aplicacion: string[]; objetivo: string | null;
          created_at: string; updated_at: string;
        },
        {
          id?: string; owner_id: string; nombre: string; descripcion?: string | null;
          tipo: "perfil" | "aptitud"; estado?: "borrador" | "publicado"; slug?: string;
          aviso_privacidad?: string | null; campos_respondiente?: Json;
          clasificacion?: "psicometrico" | "proyectivo";
          rendimiento?: "ejecucion_maxima" | "ejecucion_tipica";
          campos_aplicacion?: string[]; objetivo?: string | null;
        },
        {
          nombre?: string; descripcion?: string | null; tipo?: "perfil" | "aptitud";
          estado?: "borrador" | "publicado"; aviso_privacidad?: string | null;
          campos_respondiente?: Json;
          clasificacion?: "psicometrico" | "proyectivo";
          rendimiento?: "ejecucion_maxima" | "ejecucion_tipica";
          campos_aplicacion?: string[]; objetivo?: string | null;
        }
      >;
      dimensions: Tbl<
        { id: string; test_id: string; nombre: string; descripcion: string | null; orden: number },
        { id?: string; test_id: string; nombre: string; descripcion?: string | null; orden?: number },
        { nombre?: string; descripcion?: string | null; orden?: number }
      >;
      questions: Tbl<
        {
          id: string; test_id: string; texto: string; tipo: "opcion_multiple" | "escala";
          orden: number; obligatoria: boolean;
        },
        {
          id?: string; test_id: string; texto: string; tipo?: "opcion_multiple" | "escala";
          orden?: number; obligatoria?: boolean;
        },
        { texto?: string; tipo?: "opcion_multiple" | "escala"; orden?: number; obligatoria?: boolean }
      >;
      answer_options: Tbl<
        { id: string; question_id: string; texto: string; orden: number },
        { id?: string; question_id: string; texto: string; orden?: number },
        { texto?: string; orden?: number }
      >;
      option_weights: Tbl<
        { option_id: string; dimension_id: string; puntos: number },
        { option_id: string; dimension_id: string; puntos?: number },
        { puntos?: number }
      >;
      scoring_rules: Tbl<
        {
          id: string; test_id: string; dimension_id: string | null; min: number | null;
          max: number | null; resultado_titulo: string; resultado_texto: string | null; orden: number;
        },
        {
          id?: string; test_id: string; dimension_id?: string | null; min?: number | null;
          max?: number | null; resultado_titulo: string; resultado_texto?: string | null; orden?: number;
        },
        {
          dimension_id?: string | null; min?: number | null; max?: number | null;
          resultado_titulo?: string; resultado_texto?: string | null; orden?: number;
        }
      >;
      responses: Tbl<
        {
          id: string; test_id: string; respondiente_nombre: string | null;
          respondiente_datos: Json; consentimiento_at: string | null; resultado: Json | null;
          created_at: string;
        },
        {
          id?: string; test_id: string; respondiente_nombre?: string | null;
          respondiente_datos?: Json; consentimiento_at?: string | null; resultado?: Json | null;
        },
        never
      >;
      response_answers: Tbl<
        { response_id: string; question_id: string; option_id: string },
        { response_id: string; question_id: string; option_id: string },
        never
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      pregunta_tipo: "opcion_multiple" | "escala";
      test_estado: "borrador" | "publicado";
      test_tipo: "perfil" | "aptitud";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
