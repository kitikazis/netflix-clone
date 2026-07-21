import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { Perfil } from './entities/perfil.entity';
import { UsuariosService } from './usuarios.service';
import { PerfilesService } from './perfiles.service';
import { PerfilesController } from './perfiles.controller';

/**
 * Usuarios y perfiles (multi-perfil por cuenta).
 * Exporta los servicios para que AutenticacionModule los consuma.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Perfil])],
  controllers: [PerfilesController],
  providers: [UsuariosService, PerfilesService],
  exports: [UsuariosService, PerfilesService, TypeOrmModule],
})
export class UsuariosModule {}
