/** Contenido del access token (lo que queda en req.user tras el guard). */
export interface AccessTokenPayload {
  sub: string; // id del usuario (cuenta)
  correo: string;
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
