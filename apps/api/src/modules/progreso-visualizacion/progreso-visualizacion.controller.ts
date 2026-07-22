import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { PerfilSeleccionadoGuard } from '@/common/guards/perfil-seleccionado.guard';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { ProgresoVisualizacionService } from './progreso-visualizacion.service';
import { GuardarProgresoDto } from './dto/guardar-progreso.dto';
import { ConsultarPosicionDto } from './dto/consultar-posicion.dto';

/**
 * "Continuar viendo" e historial — por PERFIL (requiere token con perfil elegido).
 */
@ApiTags('continuar-viendo')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, PerfilSeleccionadoGuard)
@Controller('continuar-viendo')
export class ProgresoVisualizacionController {
  constructor(private readonly progreso: ProgresoVisualizacionService) {}

  @ApiOperation({ summary: 'Guarda el latido de progreso del reproductor' })
  @Put()
  guardar(@UsuarioActual('perfilId') perfilId: string, @Body() dto: GuardarProgresoDto) {
    return this.progreso.guardar(perfilId, dto);
  }

  @ApiOperation({ summary: 'Lista "continuar viendo" (no completados, recientes primero)' })
  @Get()
  continuar(
    @UsuarioActual('perfilId') perfilId: string,
    @Query('limite', new DefaultValuePipe(20), ParseIntPipe) limite: number,
  ) {
    return this.progreso.continuarViendo(perfilId, Math.min(Math.max(limite, 1), 50));
  }

  @ApiOperation({
    summary: 'Punto de reanudación de un título/episodio (incluye completados)',
  })
  @Get('posicion')
  posicion(@UsuarioActual('perfilId') perfilId: string, @Query() dto: ConsultarPosicionDto) {
    return this.progreso.posicion(perfilId, dto.contenidoId, dto.episodioId);
  }

  @ApiOperation({ summary: 'Historial completo del perfil' })
  @Get('historial')
  historial(
    @UsuarioActual('perfilId') perfilId: string,
    @Query('limite', new DefaultValuePipe(50), ParseIntPipe) limite: number,
  ) {
    return this.progreso.historial(perfilId, Math.min(Math.max(limite, 1), 100));
  }

  @ApiOperation({ summary: 'Quita un título de "continuar viendo"' })
  @Delete(':contenidoId')
  @HttpCode(204)
  eliminar(
    @UsuarioActual('perfilId') perfilId: string,
    @Param('contenidoId', ParseUUIDPipe) contenidoId: string,
    @Query('episodioId') episodioId?: string,
  ): Promise<void> {
    return this.progreso.eliminar(perfilId, contenidoId, episodioId);
  }
}
