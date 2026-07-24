import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigType } from '@nestjs/config';
import { UsuariosModule } from '@/modules/usuarios/usuarios.module';
import { whatsappConfig } from '@/config';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { TokensService } from './tokens.service';
import { HashService } from './hash.service';
import { GoogleService } from './google.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { ENVIO_WHATSAPP, EnvioWhatsAppCloud, EnvioWhatsAppDev } from './whatsapp/envio-whatsapp';

/**
 * Autenticación (JWT access + refresh, multi-perfil).
 * Los secretos se pasan por-token en TokensService/strategy, por eso JwtModule
 * se registra sin secreto global.
 */
@Module({
  imports: [PassportModule, JwtModule.register({}), UsuariosModule],
  controllers: [AutenticacionController],
  providers: [
    AutenticacionService,
    TokensService,
    HashService,
    GoogleService,
    JwtAccessStrategy,
    WhatsAppService,
    EnvioWhatsAppCloud,
    EnvioWhatsAppDev,
    {
      // El emisor real solo si hay credenciales; si no, el de desarrollo, que
      // deja el código en el log y no manda nada.
      provide: ENVIO_WHATSAPP,
      inject: [whatsappConfig.KEY, EnvioWhatsAppCloud, EnvioWhatsAppDev],
      useFactory: (
        cfg: ConfigType<typeof whatsappConfig>,
        cloud: EnvioWhatsAppCloud,
        dev: EnvioWhatsAppDev,
      ) => (cfg.token && cfg.phoneId ? cloud : dev),
    },
  ],
})
export class AutenticacionModule implements OnApplicationBootstrap {
  constructor(private readonly whatsapp: WhatsAppService) {}

  onApplicationBootstrap(): void {
    this.whatsapp.avisarEstado();
  }
}
