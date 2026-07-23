import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';
import { TranscodificacionService } from './transcodificacion.service';
import { TipoActivo } from './transcodificacion.constants';
import { ProcesarVideoDto } from './dto/procesar-video.dto';

/**
 * Encola transcodificaciones (ADMIN). Devuelve 202: el trabajo real corre en el
 * worker BullMQ; el estado se consulta en el propio recurso del catálogo
 * (`estadoProcesamiento` / `hlsPlaylistUrl`).
 */
@ApiTags('procesamiento-video')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@Controller('admin/procesamiento')
export class ProcesamientoVideoController {
  constructor(private readonly transcod: TranscodificacionService) {}

  /**
   * Va antes que las rutas con parámetro: Nest resuelve por orden de
   * declaración y `progreso` encajaría en un `:id` puesto por delante.
   */
  @ApiOperation({ summary: 'Porcentaje de lo que se está transcodificando ahora' })
  @Get('progreso')
  progreso() {
    return this.transcod.progresos();
  }

  @ApiOperation({ summary: 'Encola la transcodificación de una película' })
  @HttpCode(202)
  @Post('contenido/:id')
  procesarContenido(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ProcesarVideoDto) {
    return this.transcod.encolarContenido(id, dto.claveOrigen);
  }

  @ApiOperation({ summary: 'Encola la transcodificación de un episodio' })
  @HttpCode(202)
  @Post('episodios/:id')
  procesarEpisodio(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ProcesarVideoDto) {
    return this.transcod.encolarEpisodio(id, dto.claveOrigen);
  }

  /**
   * Reintento sin volver a subir: la clave del vídeo original quedó guardada en
   * la fila la primera vez, así que basta con encolarlo otra vez.
   */
  @ApiOperation({ summary: 'Reintenta la conversión de una película ya subida' })
  @HttpCode(202)
  @Post('contenido/:id/reintentar')
  reintentarContenido(@Param('id', ParseUUIDPipe) id: string) {
    return this.transcod.reintentar(TipoActivo.CONTENIDO, id);
  }

  @ApiOperation({ summary: 'Reintenta la conversión de un episodio ya subido' })
  @HttpCode(202)
  @Post('episodios/:id/reintentar')
  reintentarEpisodio(@Param('id', ParseUUIDPipe) id: string) {
    return this.transcod.reintentar(TipoActivo.EPISODIO, id);
  }
}
