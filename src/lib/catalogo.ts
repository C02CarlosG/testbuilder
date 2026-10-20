// Catálogos del test con su definición breve (se muestran en el formulario de configuración).

export interface Opcion<V extends string = string> {
  valor: V;
  titulo: string;
  definicion: string;
}

export const CLASIFICACIONES: Opcion<"psicometrico" | "proyectivo">[] = [
  {
    valor: "psicometrico",
    titulo: "Psicométricos",
    definicion:
      "Pruebas estandarizadas y objetivas: todas las personas contestan los mismos reactivos en las mismas condiciones y la calificación sale de reglas fijas (puntajes). Ejemplo: cuestionarios de opción múltiple o escalas Likert.",
  },
  {
    valor: "proyectivo",
    titulo: "Proyectivos",
    definicion:
      "Presentan estímulos ambiguos (manchas, láminas, dibujos, frases incompletas) para que la persona proyecte su personalidad. La interpretación es cualitativa y depende del criterio de quien evalúa. Ejemplo: Rorschach, HTP, TAT.",
  },
];

export const RENDIMIENTOS: Opcion<"ejecucion_maxima" | "ejecucion_tipica">[] = [
  {
    valor: "ejecucion_maxima",
    titulo: "Ejecución máxima",
    definicion:
      "Mide lo mejor que la persona puede rendir: capacidad, aptitud o conocimiento. Hay mejor y peor desempeño, y suele haber respuestas correctas. Ejemplo: razonamiento, habilidades, conocimientos.",
  },
  {
    valor: "ejecucion_tipica",
    titulo: "Ejecución típica",
    definicion:
      "Mide cómo suele comportarse, sentir o preferir la persona en su vida diaria: personalidad, intereses, valores, actitudes. No hay respuestas correctas o incorrectas. Ejemplo: estilo de liderazgo, intereses vocacionales.",
  },
];

export const CAMPOS_APLICACION: Opcion[] = [
  {
    valor: "clinica",
    titulo: "Área clínica",
    definicion: "Evaluación de la salud mental y emocional: apoyo al diagnóstico, detección de síntomas y seguimiento de tratamientos.",
  },
  {
    valor: "laboral",
    titulo: "Área laboral / Recursos Humanos",
    definicion: "Selección de personal, evaluación del desempeño, clima organizacional, desarrollo y promoción.",
  },
  {
    valor: "educativa",
    titulo: "Área educativa",
    definicion: "Orientación vocacional, aprendizaje, aptitudes y detección de necesidades educativas en escuelas y universidades.",
  },
  {
    valor: "forense",
    titulo: "Forense",
    definicion: "Evaluación psicológica con fines legales: peritajes, custodia, capacidad, credibilidad o riesgo.",
  },
];

export const FORMAS_DE_CALIFICAR: Opcion<"perfil" | "aptitud">[] = [
  {
    valor: "perfil",
    titulo: "Clasificar en un perfil",
    definicion: "Cada respuesta suma puntos a uno o más parámetros y gana el de mayor puntaje (ej.: tipo de liderazgo).",
  },
  {
    valor: "aptitud",
    titulo: "Medir un nivel por puntaje",
    definicion: "Se suman los puntos y el total cae en un rango que da el nivel (ej.: bajo, medio, alto). También permite niveles por parámetro.",
  },
];

/** Datos que suelen pedirse a quien contesta (botones de agregado rápido). */
export const DATOS_SUGERIDOS = [
  "Nombre", "Edad", "Sexo", "Puesto", "Área", "Empresa", "Escolaridad", "Grupo", "Correo electrónico",
];

export const etiqueta = <V extends string>(lista: Opcion<V>[], valor: string) =>
  lista.find((o) => o.valor === valor)?.titulo ?? valor;

/** Recomendaciones para redactar el aviso de privacidad. */
export const CONSEJOS_AVISO = [
  "Quién es el responsable: nombre completo o razón social y domicilio.",
  "Qué datos personales se recaban (los de la sección «Datos que se piden»), y si hay datos sensibles (salud, conducta, resultados psicológicos).",
  "Para qué se usan (finalidades): por ejemplo, evaluación, elaboración del reporte individual y estadística.",
  "Con quién se comparten los resultados (por ejemplo, la empresa o institución que solicitó la evaluación) y si hay transferencias.",
  "Cómo ejercer los derechos de acceso, rectificación, cancelación y oposición (ARCO): medio de contacto.",
  "Cuánto tiempo se conservan los datos y cómo se avisará de cambios al aviso.",
  "Lenguaje claro y breve: quien contesta debe poder entenderlo sin ayuda.",
];

export const PLANTILLA_AVISO = `AVISO DE PRIVACIDAD

[NOMBRE O RAZÓN SOCIAL DEL RESPONSABLE], con domicilio en [DOMICILIO], es responsable del tratamiento de los datos personales que usted proporcione al contestar este test.

Datos que recabamos: los que se le solicitan al inicio del test y sus respuestas. [Indique si se recaban datos sensibles, como resultados psicológicos o de salud.]

Finalidades: [por ejemplo: evaluar el objetivo del test, generar su reporte individual y elaborar estadísticas sin identificarle].

Transferencias: sus resultados se compartirán únicamente con [INSTITUCIÓN O EMPRESA QUE SOLICITA LA EVALUACIÓN], para los fines descritos. [O: no se transferirán a terceros.]

Derechos ARCO: usted puede acceder, rectificar o cancelar sus datos, u oponerse a su uso, escribiendo a [CORREO O MEDIO DE CONTACTO].

Conservación: sus datos se conservarán durante [PLAZO].

Cambios: cualquier modificación a este aviso se le informará por [MEDIO].

Al marcar la casilla de aceptación, usted manifiesta haber leído este aviso y consiente el tratamiento de sus datos.

(Plantilla orientativa, no constituye asesoría legal: revísala con tu área jurídica antes de publicarla.)`;
