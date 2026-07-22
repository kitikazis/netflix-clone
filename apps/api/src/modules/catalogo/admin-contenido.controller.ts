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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';
import { CatalogoService } from './catalogo.service';
import { CrearContenidoDto } from './dto/crear-contenido.dto';
import { ActualizarContenidoDto } from './dto/actualizar-contenido.dto';
import { ConsultarContenidoDto } from './dto/consultar-contenido.dto';

/**
 * Gestión de catálogo (ADMIN). Ve cualquier estado (borradores incluidos) y
 * opera por id. Guardas a nivel de clase: token válido + rol ADMIN.
 */
@ApiTags('catalogo · admin')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@Controller('admin/catalogo/contenido')
export class AdminContenidoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @ApiOperation({ summary: 'Lista contenido en cualquier estado (filtro opcional publicado)' })
  @Get()
  listar(@Query() dto: ConsultarContenidoDto) {
    return this.catalogo.listar(dto, false);
  }

  @ApiOperation({ summary: 'Detalle por id (cualquier estado)' })
  @Get(':id')
  detalle(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogo.obtenerPorId(id);
  }

  @ApiOperation({ summary: 'Crea un título' })
  @Post()
  crear(@Body() dto: CrearContenidoDto) {
    return this.catalogo.crear(dto);
  }

  @ApiOperation({ summary: 'Actualiza un título' })
  @Patch(':id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarContenidoDto) {
    return this.catalogo.actualizar(id, dto);
  }

  @ApiOperation({ summary: 'Elimina un título' })
  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.catalogo.eliminar(id);
  }
}
