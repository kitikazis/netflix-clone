import { randomInt } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '@/redis/redis.constants';
import { whatsappConfig } from '@/config';
import { HashService } from '../hash.service';
import { ENVIO_WHATSAPP, EnvioWhatsApp } from './envio-whatsapp';

/** Lo que hay que hacer con el teléfono verificado: crear o encontrar la cuenta. */
export interface ResueltoWhatsApp {
  telefono: string;
}

/**
 * Código de un solo uso por WhatsApp.
 *
 * El código no se guarda tal cual en ningún sitio: se manda al teléfono y en
 * Redis solo queda su hash, con caducidad. Así ni un vistazo a la base ni un
 * volcado de Redis revelan códigos vivos, y el borrado automático al caducar
 * evita ir limpiando notas de usar y tirar.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly cfg: ConfigType<typeof whatsappConfig>;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(ENVIO_WHATSAPP) private readonly envio: EnvioWhatsApp,
    @Inject(whatsappConfig.KEY) cfg: ConfigType<typeof whatsappConfig>,
    private readonly hash: HashService,
  ) {
    this.cfg = cfg;
  }

  private clave(telefono: string): string {
    return `otp:wa:${telefono}`;
  }
  private claveEspera(telefono: string): string {
    return `otp:wa:espera:${telefono}`;
  }

  /**
   * Genera y manda un código.
   *
   * No dice si el número existe ni si se mandó de verdad —eso lo sabe el dueño
   * del teléfono cuando le llega—: siempre responde igual, para que nadie use
   * este endpoint para averiguar qué números tienen cuenta.
   */
  async solicitar(telefono: string): Promise<void> {
    // Un throttle en Redis impide pedir códigos a ráfagas: gasta cupo de Meta y
    // machaca a alguien con mensajes usando su número.
    const espera = await this.redis.get(this.claveEspera(telefono));
    if (espera) {
      throw new HttpException(
        'Acabas de pedir un código. Espera un momento antes de pedir otro.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const hash = await this.hash.hash(codigo);

    // 0 intentos consumidos, guardado como campo aparte del mismo hash.
    await this.redis.set(
      this.clave(telefono),
      JSON.stringify({ hash, intentos: 0 }),
      'EX',
      this.cfg.codigoTtlMin * 60,
    );
    await this.redis.set(this.claveEspera(telefono), '1', 'EX', this.cfg.esperaReenvioS);

    try {
      await this.envio.enviarCodigo(telefono, codigo);
    } catch (err) {
      // Si el envío falla, se retira el código: dejarlo vivo permitiría probar
      // suerte contra un código que su dueño nunca recibió.
      await this.redis.del(this.clave(telefono));
      throw err;
    }
  }

  /**
   * Comprueba el código y devuelve el teléfono si es correcto.
   *
   * Cada intento fallido cuenta; agotados, el código se invalida y hay que pedir
   * otro. Así un código de seis dígitos no se puede reventar a fuerza de probar.
   */
  async verificar(telefono: string, codigo: string): Promise<ResueltoWhatsApp> {
    const crudo = await this.redis.get(this.clave(telefono));
    if (!crudo) {
      throw new UnauthorizedException('El código ha caducado o no existe. Pide uno nuevo.');
    }

    const { hash, intentos } = JSON.parse(crudo) as { hash: string; intentos: number };

    if (intentos >= this.cfg.maxIntentos) {
      await this.redis.del(this.clave(telefono));
      throw new UnauthorizedException('Demasiados intentos. Pide un código nuevo.');
    }

    const coincide = await this.hash.comparar(codigo, hash);
    if (!coincide) {
      // Se anota el intento manteniendo lo que queda de vida del código, para no
      // regalar una ventana extra a base de fallar.
      const ttl = await this.redis.ttl(this.clave(telefono));
      await this.redis.set(
        this.clave(telefono),
        JSON.stringify({ hash, intentos: intentos + 1 }),
        'EX',
        Math.max(ttl, 1),
      );
      throw new UnauthorizedException('Código incorrecto.');
    }

    // Acertado: se consume, no vale una segunda vez.
    await this.redis.del(this.clave(telefono));
    await this.redis.del(this.claveEspera(telefono));
    return { telefono };
  }

  /** ¿Está el envío real configurado? */
  get disponible(): boolean {
    return this.envio.disponible;
  }

  /** Aviso al arrancar de si WhatsApp manda de verdad o solo registra el código. */
  avisarEstado(): void {
    if (this.disponible) {
      this.logger.log('Entrada por WhatsApp activa (Meta Cloud API)');
    } else {
      this.logger.warn(
        'WhatsApp en modo desarrollo: los códigos se registran en el log, no se envían. ' +
          'Configura WHATSAPP_TOKEN y WHATSAPP_PHONE_ID para enviarlos de verdad.',
      );
    }
  }
}
