import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { AccessTokenPayload } from '@/common/interfaces/token-payload.interface';
import { AutenticacionService } from './autenticacion.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { RefrescarTokenDto } from './dto/refrescar-token.dto';

@ApiTags('autenticacion')
@Controller('auth')
export class AutenticacionController {
  constructor(private readonly auth: AutenticacionService) {}

  @ApiOperation({ summary: 'Crea una cuenta con un perfil por defecto' })
  @Post('registro')
  registro(@Body() dto: RegistroDto) {
    return this.auth.registro(dto);
  }

  @ApiOperation({ summary: 'Inicia sesión (cuenta) y devuelve tokens + perfiles' })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiOperation({ summary: 'Rota el par de tokens' })
  @HttpCode(200)
  @Post('refrescar')
  refrescar(@Body() dto: RefrescarTokenDto) {
    return this.auth.refrescar(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Revoca el refresh token indicado' })
  @HttpCode(200)
  @Post('logout')
  logout(@Body() dto: RefrescarTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Selecciona un perfil y emite un access token con perfil' })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard)
  @HttpCode(200)
  @Post('perfiles/:id/seleccionar')
  seleccionar(
    @UsuarioActual() usuario: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.auth.seleccionarPerfil(usuario.sub, usuario.correo, id);
  }
}
