export const SECTION_PATTERNS: Record<string, RegExp> = {
  datos_personales:
    /^(?:datos\s+personales|informaci[oó]n\s+(?:personal|de\s+contacto)|perfil\s+personal|contacto)/i,
  educacion:
    /^(?:educaci[oó]n|formaci[oó]n\s+acad[eé]mica|estudios|antecedentes\s+acad[eé]micos|formaci[oó]n)/i,
  experiencia:
    /^(?:experiencia\s+(?:laboral|profesional)?|historial\s+laboral|trayectoria\s+(?:laboral|profesional)|antecedentes\s+laborales)/i,
  idiomas:
    /^(?:idiomas|languages|competencias\s+ling[uü][ií]sticas|conocimientos\s+de\s+idiomas)/i,
};

export const YEAR_PATTERN = /\b(19|20)\d{2}\b/g;
export const YEAR_RANGE_PATTERN =
  /\b((?:19|20)\d{2})\s*[-–—a]\s*((?:19|20)\d{2}|presente|actual|actualidad|la\s+fecha)\b/i;
export const EMAIL_PATTERN = /[\w.-]+@[\w.-]+\.\w{2,}/;
export const PHONE_PATTERN =
  /(?:\+?56\s?)?(?:9\s?\d{4}\s?\d{4}|\d{2}\s?\d{3}\s?\d{4}|\(\d{2}\)\s?\d{3}\s?\d{4})/;

export const KNOWN_UNIVERSITIES = [
  'universidad de chile',
  'pontificia universidad cat[oó]lica',
  'universidad de santiago',
  'universidad de concepci[oó]n',
  'universidad t[eé]cnica federico santa mar[ií]a',
  'universidad austral',
  'universidad de valpara[ií]so',
  'universidad diego portales',
  'universidad andr[eé]s bello',
  'universidad adolfo ib[aá][nñ]ez',
  'universidad del desarrollo',
  'universidad mayor',
  'universidad de los andes',
  'duoc\s*uc',
  'inacap',
  'aiep',
  'ip\s+',
  'cft\s+',
  'instituto\s+profesional',
  'centro\s+de\s+formaci[oó]n',
];

export const KNOWN_LANGUAGES = [
  { pattern: /\b(?:espa[nñ]ol|castellano|spanish)\b/i, name: 'Espanol' },
  { pattern: /\b(?:ingl[eé]s|english|ingles)\b/i, name: 'Ingles' },
  { pattern: /\b(?:portugu[eé]s|portuguese)\b/i, name: 'Portugues' },
  { pattern: /\b(?:franc[eé]s|french)\b/i, name: 'Frances' },
  { pattern: /\b(?:alem[aá]n|german|deutsch)\b/i, name: 'Aleman' },
  { pattern: /\b(?:italiano|italian)\b/i, name: 'Italiano' },
  { pattern: /\b(?:chino|mandarin|chinese)\b/i, name: 'Chino' },
  { pattern: /\b(?:japon[eé]s|japanese)\b/i, name: 'Japones' },
];

export const LANGUAGE_LEVELS = [
  { pattern: /\b(?:nativo|native|materno|lengua\s+materna)\b/i, level: 'Nativo' },
  { pattern: /\b(?:avanzado|advanced|fluido|fluent|c[12])\b/i, level: 'Avanzado' },
  { pattern: /\b(?:intermedio|intermediate|b[12])\b/i, level: 'Intermedio' },
  { pattern: /\b(?:b[aá]sico|basic|elemental|beginner|a[12])\b/i, level: 'Basico' },
];
