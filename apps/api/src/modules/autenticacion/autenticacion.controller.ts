import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import { AccessTokenPayload } from '@/common/interfaces/token-payload.interface';
import { AutenticacionService } from './autenticacion.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleDto } from './dto/google.dto';
import { SolicitarWhatsAppDto, VerificarWhatsAppDto } from './dto/whatsapp.dto';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import { RefrescarTokenDto } from './dto/refrescar-token.dto';

@ApiTags('autenticacion')
@Controller('auth')
export class AutenticacionController {
  constructor(
    private readonly auth: AutenticacionService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  @ApiOperation({ summary: 'Crea una cuenta con un perfil por defecto' })
  @Throttle({ general: { limit: 5, ttl: 60_000 } })
  @Post('registro')
  registro(@Body() dto: RegistroDto) {
    return this.auth.registro(dto);
  }

  @ApiOperation({ summary: 'Inicia sesión (cuenta) y devuelve tokens + perfiles' })
  @HttpCode(200)
  @Throttle({ general: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiOperation({ summary: 'Rota el par de tokens' })
  @HttpCode(200)
  @Throttle({ general: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Entra con una cuenta de Google' })
  @HttpCode(200)
  @Post('google')
  google(@Body() dto: GoogleDto) {
    return this.auth.entrarConGoogle(dto.idToken);
  }

  @ApiOperation({ summary: 'Pide un código de acceso por WhatsApp' })
  @HttpCode(204)
  @Post('whatsapp/solicitar')
  async solicitarWhatsApp(@Body() dto: SolicitarWhatsAppDto): Promise<void> {
    // No se exige aquí que el envío real esté configurado: en desarrollo el
    // código se registra en el log, y eso es justo lo que permite probar el
    // flujo sin cuenta de Meta. Quien no quiera ofrecer WhatsApp deja el botón
    // oculto (NEXT_PUBLIC_AUTH_WHATSAPP en el front) y nadie llega hasta aquí.
    await this.whatsapp.solicitar(dto.telefono);
  }

  @ApiOperation({ summary: 'Verifica el código de WhatsApp y entra' })
  @HttpCode(200)
  @Post('whatsapp/verificar')
  verificarWhatsApp(@Body() dto: VerificarWhatsAppDto) {
    return this.auth.entrarConWhatsApp(dto.telefono, dto.codigo);
  }

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
    return this.auth.seleccionarPerfil(usuario.sub, usuario.correo, usuario.rol, id);
  }
}
