import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';

/** Contenido del access token (lo que queda en req.user tras el guard). */
export interface AccessTokenPayload {
  sub: string; // id del usuario (cuenta)
  correo: string;
  rol: RolUsuario; // autoriza operaciones de administración (p. ej. mutar catálogo)
  perfilId?: string; // presente tras "seleccionar perfil"
  esInfantil?: boolean;
  type: 'access';
}

/** Contenido del refresh token. */
export interface RefreshTokenPayload {
  sub: string; // id del usuario
  jti: string; // identificador único para rotación/revocación en Redis
  type: 'refresh';
}
