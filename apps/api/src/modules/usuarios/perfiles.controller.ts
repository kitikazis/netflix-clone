import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { PerfilesService } from './perfiles.service';
import { CrearPerfilDto } from './dto/crear-perfil.dto';

@ApiTags('perfiles')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('perfiles')
export class PerfilesController {
  constructor(private readonly perfiles: PerfilesService) {}

  @Get()
  listar(@UsuarioActual('sub') usuarioId: string) {
    return this.perfiles.listarDeUsuario(usuarioId);
  }

  @Post()
  crear(@UsuarioActual('sub') usuarioId: string, @Body() dto: CrearPerfilDto) {
    return this.perfiles.crear(usuarioId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(
    @UsuarioActual('sub') usuarioId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.perfiles.eliminar(usuarioId, id);
  }
}
