/**
 * Códigos de error de Prisma que se traducen a una respuesta HTTP concreta.
 *
 * - P2002: violación de restricción única (email de autor, ISBN de libro).
 * - P2025: el registro que se quería actualizar o borrar no existe.
 *
 * Se comprueban con un type guard en lugar de `catch (error: any)` porque
 * ESLint prohíbe `any` y porque `unknown` obliga a verificar la forma del
 * objeto antes de leer `.code`.
 */
export function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}
