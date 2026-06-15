/**
 * Lectura estricta de variables de entorno sensibles.
 * Falla de forma explícita si una variable requerida no está definida,
 * en lugar de caer silenciosamente a un valor por defecto inseguro.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Variable de entorno requerida no definida: ${name}`);
  }
  return value;
}
