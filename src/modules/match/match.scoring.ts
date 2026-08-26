/**
 * Scoring de match entre una oferta y el perfil de un postulante.
 *
 * Vive aparte de `MatchService` porque es una funcion pura y la necesitan dos
 * modulos: `match`, que la expone en sus endpoints, y `applications`, que
 * persiste el score al crear la postulacion. Importar el service desde
 * applications crearia un ciclo entre modulos; importar esto, no.
 *
 * Los pesos estan exportados para tuning: no son una verdad, son un punto de
 * partida que hay que ajustar con datos reales.
 */

// ======================================================
// ⚖️ Pesos del match (suman 100). Exportados para tuning.
// ======================================================
export const PESOS_MATCH = {
  area: 30,
  experiencia: 25,
  modalidad: 15,
  ubicacion: 15,
  educacion: 10,
  herramientas: 5,
} as const;

export type DesgloseMatch = Record<keyof typeof PESOS_MATCH, number>;

export interface ResultadoMatch {
  score: number;
  desglose: DesgloseMatch;
}

// Orden ascendente de seniority para comparar nivel de experiencia.
const NIVELES_EXPERIENCIA = [
  'sin_experiencia',
  'con_experiencia',
  'junior',
  'semi_senior',
  'senior',
  'experto',
];

// ======================================================
// 🔤 Normalización: minúsculas y sin tildes
// ======================================================
function norm(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function incluyeAlguno(haystack: string, agujas: string[]): boolean {
  const h = norm(haystack);
  return agujas.some((a) => {
    const n = norm(a);
    return n.length > 0 && (h.includes(n) || n.includes(h));
  });
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

// ======================================================
// 🧮 Scoring: oferta vs perfil del postulante
// ======================================================
export function scoreOfertaPostulante(
  ofertaData: Record<string, any> | null | undefined,
  postulanteData: Record<string, any> | null | undefined,
): ResultadoMatch {
  const o = ofertaData ?? {};
  const p = postulanteData ?? {};

  const experiencias = asArray(p.experiencias);
  const cargos = experiencias.map((e) => e?.cargo).filter(Boolean);
  const educacion = asArray(p.datos_personales?.educacion ?? p.educacion);
  const titulos = educacion.map((e) => e?.titulo).filter(Boolean);
  const preferencias = p.preferencias ?? {};
  const habilidades = [
    ...asArray(p.habilidades),
    ...asArray(p.herramientas),
    ...asArray(preferencias.herramientas),
  ]
    .map((h) => (typeof h === 'string' ? h : h?.nombre))
    .filter(Boolean);

  const desglose: DesgloseMatch = {
    area: 0,
    experiencia: 0,
    modalidad: 0,
    ubicacion: 0,
    educacion: 0,
    herramientas: 0,
  };

  // 1️⃣ Área / categoría de empleo
  const area = o.area_trabajo;
  if (area) {
    const matchCategoria = incluyeAlguno(preferencias.categoria_empleo ?? '', [area]);
    const matchCargo = cargos.some((c) => incluyeAlguno(c, [area]));
    if (matchCategoria && matchCargo) desglose.area = PESOS_MATCH.area;
    else if (matchCategoria || matchCargo) desglose.area = Math.round(PESOS_MATCH.area * 0.7);
  } else {
    // Sin requisito de área → no penalizar.
    desglose.area = PESOS_MATCH.area;
  }

  // 2️⃣ Experiencia / nivel
  const nivelOferta = norm(o.nivel_experiencia);
  if (!nivelOferta || nivelOferta === 'sin_experiencia') {
    desglose.experiencia = PESOS_MATCH.experiencia;
  } else {
    const idxOferta = NIVELES_EXPERIENCIA.indexOf(nivelOferta);
    // Años acumulados declarados por el candidato (si existen).
    const aniosCandidato = experiencias.reduce((acc, e) => acc + (Number(e?.anios) || 0), 0);
    const nivelCandidato = inferirNivel(aniosCandidato, experiencias.length);
    const idxCandidato = NIVELES_EXPERIENCIA.indexOf(nivelCandidato);

    if (idxCandidato >= idxOferta && idxOferta >= 0) {
      desglose.experiencia = PESOS_MATCH.experiencia;
    } else if (idxOferta >= 0) {
      // Cuanto más cerca del nivel requerido, mayor puntaje parcial.
      const distancia = Math.max(0, idxOferta - idxCandidato);
      const factor = Math.max(0, 1 - distancia * 0.34);
      desglose.experiencia = Math.round(PESOS_MATCH.experiencia * factor);
    }
  }

  // 3️⃣ Modalidad
  const modalidadOferta = norm(o.modalidad);
  const modalidadCandidato = norm(preferencias.modalidad);
  if (!modalidadOferta || !modalidadCandidato || modalidadOferta === 'hibrido') {
    desglose.modalidad = PESOS_MATCH.modalidad;
  } else if (modalidadOferta === modalidadCandidato || modalidadCandidato === 'hibrido') {
    desglose.modalidad = PESOS_MATCH.modalidad;
  }

  // 4️⃣ Ubicación (irrelevante si la oferta es remota)
  if (modalidadOferta === 'remoto' || !o.region) {
    desglose.ubicacion = PESOS_MATCH.ubicacion;
  } else {
    const regionCand = preferencias.region ?? p.datos_personales?.region ?? p.region;
    const comunaCand = preferencias.comuna ?? p.datos_personales?.comuna ?? p.comuna;
    const matchRegion = incluyeAlguno(o.region, [regionCand]);
    const matchComuna = o.comuna ? incluyeAlguno(o.comuna, [comunaCand]) : false;
    if (matchComuna) desglose.ubicacion = PESOS_MATCH.ubicacion;
    else if (matchRegion) desglose.ubicacion = Math.round(PESOS_MATCH.ubicacion * 0.7);
  }

  // 5️⃣ Educación
  if (!o.educacion_requerida) {
    desglose.educacion = PESOS_MATCH.educacion;
  } else if (titulos.some((t) => incluyeAlguno(t, [o.educacion_requerida]))) {
    desglose.educacion = PESOS_MATCH.educacion;
  }

  // 6️⃣ Herramientas / requisitos
  const requeridas = [
    ...asArray(o.herramientas_basicas),
    ...asArray(o.otras_herramientas),
    ...asArray(o.requisitos_minimos),
  ].filter(Boolean);
  if (requeridas.length === 0) {
    desglose.herramientas = PESOS_MATCH.herramientas;
  } else {
    const cubiertas = requeridas.filter((r) => incluyeAlguno(r, habilidades)).length;
    desglose.herramientas = Math.round((cubiertas / requeridas.length) * PESOS_MATCH.herramientas);
  }

  const score = Object.values(desglose).reduce((a, b) => a + b, 0);
  return { score: Math.min(100, Math.max(0, score)), desglose };
}

export function inferirNivel(anios: number, cantidadExperiencias: number): string {
  if (anios <= 0 && cantidadExperiencias === 0) return 'sin_experiencia';
  if (anios < 1) return 'con_experiencia';
  if (anios < 3) return 'junior';
  if (anios < 5) return 'semi_senior';
  if (anios < 8) return 'senior';
  return 'experto';
}

/** Parseo defensivo de `oferta.data`, que es una columna text con JSON. */
export function parseOfertaData(oferta: { data?: any } | null | undefined): Record<string, any> {
  if (!oferta?.data) return {};
  if (typeof oferta.data === 'object') return oferta.data as Record<string, any>;
  try {
    return JSON.parse(oferta.data);
  } catch {
    return {};
  }
}
