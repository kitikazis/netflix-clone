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
import { GenerosService } from './generos.service';
import { CrearGeneroDto } from './dto/crear-genero.dto';
import { ActualizarGeneroDto } from './dto/actualizar-genero.dto';

@ApiTags('catalogo · generos')
@Controller('catalogo/generos')
export class GenerosController {
  constructor(private readonly generos: GenerosService) {}

  @ApiOperation({ summary: 'Lista todos los géneros (público)' })
  @Get()
  listar() {
    return this.generos.listar();
  }

  @ApiOperation({ summary: 'Detalle de un género por slug (público)' })
  @Get(':slug')
  detalle(@Param('slug') slug: string) {
    return this.generos.buscarPorSlug(slug);
  }

  @ApiOperation({ summary: 'Crea un género (admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Post()
  crear(@Body() dto: CrearGeneroDto) {
    return this.generos.crear(dto);
  }

  @ApiOperation({ summary: 'Actualiza un género (admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Patch(':id')
  actualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActualizarGeneroDto) {
    return this.generos.actualizar(id, dto);
  }

  @ApiOperation({ summary: 'Elimina un género (admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(RolUsuario.ADMIN)
  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.generos.eliminar(id);
  }
}
