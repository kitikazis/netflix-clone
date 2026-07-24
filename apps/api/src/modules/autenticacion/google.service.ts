import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { googleConfig } from '@/config';

/** Lo poco que se usa del token de Google, ya validado. */
export interface IdentidadGoogle {
  correo: string;
  nombre?: string;
  fotoUrl?: string;
}

/**
 * Verificación del token que Google entrega al navegador.
 *
 * El navegador recibe un JWT firmado por Google y lo manda aquí. Esta clase
 * comprueba que la firma sea de Google, que el token vaya dirigido a ESTA
 * aplicación y que el correo esté verificado. Sin la comprobación del
 * destinatario, un token emitido para cualquier otra aplicación de Google
 * serviría para entrar como cualquiera: es el error clásico de este flujo.
 *
 * `google-auth-library` se encarga de descargar y cachear las claves públicas
 * de Google, que rotan solas cada pocos días.
 */
@Injectable()
export class GoogleService {
  private readonly cliente?: OAuth2Client;
  private readonly clientId?: string;

  constructor(@Inject(googleConfig.KEY) config: ConfigType<typeof googleConfig>) {
    this.clientId = config.clientId;
    if (this.clientId) {
      this.cliente = new OAuth2Client(this.clientId);
    }
  }

  /** ¿Está configurada la entrada con Google? */
  get disponible(): boolean {
    return !!this.cliente;
  }

  async verificar(idToken: string): Promise<IdentidadGoogle> {
    if (!this.cliente || !this.clientId) {
      throw new ServiceUnavailableException(
        'La entrada con Google no está configurada en el servidor',
      );
    }

    let payload;
    try {
      const ticket = await this.cliente.verifyIdToken({
        idToken,
        // El filtro que impide aceptar tokens de otras aplicaciones.
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      // Firma inválida, caducado o manipulado: no se distingue a propósito,
      // que detallarlo solo ayuda a quien esté probando a colarse.
      throw new UnauthorizedException('El token de Google no es válido');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('El token de Google no trae correo');
    }
    if (!payload.email_verified) {
      // Sin esto, cualquiera podría crearse una cuenta de Google con el correo
      // de otra persona sin demostrar que es suyo y entrar aquí como ella.
      throw new UnauthorizedException('Google no ha verificado ese correo');
    }

    return {
      correo: payload.email.toLowerCase(),
      nombre: payload.name,
      fotoUrl: payload.picture,
    };
  }
}
