import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { ConsultarUsuariosDto } from './dto/consultar-usuarios.dto';
import { RolUsuario } from './enums/rol-usuario.enum';
import { AdminUsuariosService } from './admin-usuarios.service';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

/** Gestión de cuentas. Solo ADMIN. */
@ApiTags('admin-usuarios')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@Controller('admin/usuarios')
export class AdminUsuariosController {
  constructor(private readonly usuarios: AdminUsuariosService) {}

  @ApiOperation({ summary: 'Lista las cuentas (nunca incluye el hash de contraseña)' })
  @Get()
  listar(@Query() dto: ConsultarUsuariosDto) {
    return this.usuarios.listar(dto, dto.q);
  }

  @ApiOperation({ summary: 'Cambia el rol o el estado de una cuenta' })
  @Patch(':id')
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual('sub') solicitante: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.usuarios.actualizar(id, solicitante, dto);
  }

  @ApiOperation({ summary: 'Elimina una cuenta con sus perfiles y su progreso' })
  @Delete(':id')
  @HttpCode(204)
  eliminar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual('sub') solicitante: string,
  ): Promise<void> {
    return this.usuarios.eliminar(id, solicitante);
  }
}

/**
 * Resumen del estado de la base. No pretende sustituir a un explorador de
 * tablas (para eso ya está el panel del proveedor de Postgres): da las cifras
 * que interesan a diario sin tener que escribir SQL.
 */
@ApiTags('admin-usuarios')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@Controller('admin/estadisticas')
export class AdminEstadisticasController {
  constructor(private readonly dataSource: DataSource) {}

  @ApiOperation({ summary: 'Conteos por tabla y desglose del catálogo' })
  @Get()
  async resumen() {
    const [fila] = await this.dataSource.query<
      Array<Record<string, string>>
    >(`
      SELECT
        (SELECT count(*) FROM usuarios)                                    AS usuarios,
        (SELECT count(*) FROM usuarios WHERE rol = 'ADMIN')                AS administradores,
        (SELECT count(*) FROM usuarios WHERE activo = false)               AS inactivos,
        (SELECT count(*) FROM perfiles)                                    AS perfiles,
        (SELECT count(*) FROM contenido)                                   AS contenido,
        (SELECT count(*) FROM contenido WHERE publicado)                   AS publicados,
        (SELECT count(*) FROM contenido WHERE tipo = 'PELICULA')           AS peliculas,
        (SELECT count(*) FROM contenido WHERE tipo = 'SERIE')              AS series,
        (SELECT count(*) FROM contenido WHERE estado_procesamiento = 'LISTO') AS transcodificados,
        (SELECT count(*) FROM episodios)                                   AS episodios,
        (SELECT count(*) FROM generos)                                     AS generos,
        (SELECT count(*) FROM progreso_visualizacion)                      AS progresos
    `);

    // Postgres devuelve los count() como texto (bigint no cabe en un number JS).
    const numeros = Object.fromEntries(
      Object.entries(fila).map(([clave, valor]) => [clave, Number(valor)]),
    );
    return numeros;
  }
}
