import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { whatsappConfig } from '@/config';

/** Token DI del emisor de mensajes. */
export const ENVIO_WHATSAPP = Symbol('ENVIO_WHATSAPP');

export interface EnvioWhatsApp {
  /** Manda el código de un solo uso al teléfono (formato +51999…). */
  enviarCodigo(telefono: string, codigo: string): Promise<void>;
  /** ¿Está el envío real configurado? Para no ofrecer el botón si no lo está. */
  readonly disponible: boolean;
}

/**
 * Envío por Meta Cloud API.
 *
 * Se usa una plantilla de la categoría «autenticación», que es la única que
 * Meta permite para códigos de acceso; su nombre y su idioma se configuran. El
 * código va como parámetro del cuerpo y, otra vez, como parámetro del botón de
 * copiar, que es lo que exige ese tipo de plantilla.
 *
 * Solo se activa si hay token y phoneId; si no, se usa {@link EnvioWhatsAppDev}.
 */
@Injectable()
export class EnvioWhatsAppCloud implements EnvioWhatsApp {
  private readonly logger = new Logger(EnvioWhatsAppCloud.name);
  private readonly cfg: ConfigType<typeof whatsappConfig>;

  constructor(@Inject(whatsappConfig.KEY) cfg: ConfigType<typeof whatsappConfig>) {
    this.cfg = cfg;
  }

  get disponible(): boolean {
    return !!(this.cfg.token && this.cfg.phoneId);
  }

  async enviarCodigo(telefono: string, codigo: string): Promise<void> {
    // Meta quiere el número sin el «+».
    const destino = telefono.replace(/^\+/, '');
    const url = `https://graph.facebook.com/${this.cfg.apiVersion}/${this.cfg.phoneId}/messages`;

    const cuerpo = {
      messaging_product: 'whatsapp',
      to: destino,
      type: 'template',
      template: {
        name: this.cfg.template,
        language: { code: this.cfg.lang },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: codigo }] },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: codigo }],
          },
        ],
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    });

    if (!res.ok) {
      // El detalle de Meta se registra pero NO se propaga al usuario: puede
      // incluir por qué el número es inválido, y eso no es asunto suyo.
      const detalle = await res.text().catch(() => '');
      this.logger.error(`Meta rechazó el envío (${res.status}): ${detalle.slice(0, 300)}`);
      throw new Error('No se pudo enviar el código por WhatsApp');
    }
  }
}

/**
 * Emisor de desarrollo: no manda nada, deja el código en el log.
 *
 * Permite probar el flujo entero sin cuenta de Meta. Se marca como no
 * disponible para que el botón no se ofrezca a usuarios reales por error.
 */
@Injectable()
export class EnvioWhatsAppDev implements EnvioWhatsApp {
  private readonly logger = new Logger('EnvioWhatsAppDev');
  readonly disponible = false;

  enviarCodigo(telefono: string, codigo: string): Promise<void> {
    this.logger.warn(`[SIN ENVÍO REAL] Código para ${telefono}: ${codigo}`);
    return Promise.resolve();
  }
}
