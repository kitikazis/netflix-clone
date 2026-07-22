import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';
import { EpisodiosService } from './episodios.service';
import { CrearEpisodioDto } from './dto/crear-episodio.dto';
import { ActualizarEpisodioDto } from './dto/actualizar-episodio.dto';

@ApiTags('catalogo · episodios')
@Controller('catalogo')
export class EpisodiosController {
  constructor(private readonly episodios: EpisodiosService) {}

  @ApiOperation({ summary: 'Lista los episodios de una serie publicada (público)' })
  @Get('contenido/:contenidoId/episodios')
  listar(@Param('contenidoId', ParseUUIDPipe) contenidoId: string) {
    return this.episodios.listarDeContenido(contenidoId, true);
  }

  @ApiOperation({ summary: 'Detalle de un episodio (público)' })
  @Get('episodios/:id')
  obtener(@Param('id', ParseUUIDPipe) id: string) {
    return this.episodios.obtener(id);
  }

  @ApiOperation({ summary: 'Crea un episodio en una serie (admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Post('contenido/:contenidoId/episodios')
  crear(@Param('contenidoId', ParseUUIDPipe) contenidoId: string, @Body() dto: CrearEpisodioDto) {
    return this.episodios.crear(contenidoId, dto);
  }

  @ApiOperation({ summary: 'Actualiza un episodio (admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Patch('episodios/:id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarEpisodioDto) {
    return this.episodios.actualizar(id, dto);
  }

  @ApiOperation({ summary: 'Elimina un episodio (admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Delete('episodios/:id')
  @HttpCode(204)
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.episodios.eliminar(id);
  }
}
