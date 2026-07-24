/**
 * Cómo se creó la cuenta.
 *
 * No es lo mismo que «cómo entra hoy»: una cuenta creada con contraseña que
 * luego enlaza con Google puede entrar de las dos formas, pero su origen sigue
 * siendo LOCAL. Lo que interesa saber en el panel es de dónde salió.
 */
export enum ProveedorRegistro {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}
