import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { Perfil } from './entities/perfil.entity';

/**
 * Usuarios y perfiles (multi-perfil por cuenta) — entidades en Fase 2, lógica en Fase 3.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Perfil])],
  exports: [TypeOrmModule],
})
export class UsuariosModule {}
