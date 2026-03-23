/**
 * Lee variables de entorno en tiempo de ejecución.
 * Evita que Next sustituya `process.env.NOMBRE` en el build con valores vacíos
 * cuando `next build` se ejecutó sin .env (común con `next start` local).
 */
export function runtimeEnv(name: string): string | undefined {
  return process.env[name];
}
