import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { AccessTokenPayload } from '@/common/interfaces/token-payload.interface';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';
import { ALMACENAMIENTO, Almacenamiento } from './almacenamiento/almacenamiento';
import { FirmarSubidaDto } from './dto/firmar-subida.dto';
import { ConfirmarSubidaDto } from './dto/confirmar-subida.dto';
import { SubidasService } from './subidas.service';

/**
 * Subida de vídeos fuente (ADMIN) — Fase 6.
 * Flujo: 1) POST /firmar → devuelve `{ clave, url, metodo }`.
 *        2) el cliente hace `PUT url` con el archivo (a R2 prefirmado, o a
 *           /directa si el driver es local).
 *        3) usa `clave` como `claveOrigen` en /admin/procesamiento/... (Fase 5).
 */
@ApiTags('subidas')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@Controller('admin/subidas')
export class SubidasController {
  constructor(
    @Inject(ALMACENAMIENTO) private readonly almacenamiento: Almacenamiento,
    private readonly subidas: SubidasService,
  ) {}

  @ApiOperation({ summary: 'Prepara la subida de un vídeo fuente (URL de destino)' })
  @Post('firmar')
  firmar(@Body() dto: FirmarSubidaDto, @UsuarioActual() usuario: AccessTokenPayload) {
    // Se anota aquí quién sube: los bytes van directos al almacenamiento y esa
    // petición ya no pasa por la API, así que después ya no habría forma.
    return this.subidas.preparar(dto.nombreArchivo, dto.contentType, {
      id: usuario.sub,
      correo: usuario.correo,
    });
  }

  @ApiOperation({ summary: 'Confirma que el archivo llegó al almacenamiento' })
  @HttpCode(204)
  @Post('confirmar')
  async confirmar(@Body() dto: ConfirmarSubidaDto): Promise<void> {
    await this.subidas.confirmar(dto.clave, dto.tamanoBytes);
  }

  @ApiOperation({
    summary: 'Subida directa por streaming (solo driver local; el cuerpo es el archivo)',
  })
  @HttpCode(200)
  @Put('directa')
  async directa(@Query('clave') clave: string, @Req() req: Request) {
    if (!clave) {
      throw new BadRequestException('Falta el parámetro "clave"');
    }
    await this.almacenamiento.guardarStream(clave, req);
    return { clave };
  }
}
