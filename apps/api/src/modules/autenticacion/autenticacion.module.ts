import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsuariosModule } from '@/modules/usuarios/usuarios.module';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { TokensService } from './tokens.service';
import { HashService } from './hash.service';
import { GoogleService } from './google.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

/**
 * Autenticación (JWT access + refresh, multi-perfil).
 * Los secretos se pasan por-token en TokensService/strategy, por eso JwtModule
 * se registra sin secreto global.
 */
@Module({
  imports: [PassportModule, JwtModule.register({}), UsuariosModule],
  controllers: [AutenticacionController],
  providers: [AutenticacionService, TokensService, HashService, GoogleService, JwtAccessStrategy],
})
export class AutenticacionModule {}
