import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '@/modules/usuarios/usuarios.service';
import { PerfilesService } from '@/modules/usuarios/perfiles.service';
import { Usuario } from '@/modules/usuarios/entities/usuario.entity';
import { Perfil } from '@/modules/usuarios/entities/perfil.entity';
import { RolUsuario } from '@/modules/usuarios/enums/rol-usuario.enum';
import { RefreshTokenPayload } from '@/common/interfaces/token-payload.interface';
import { HashService } from './hash.service';
import { TokensService } from './tokens.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleService } from './google.service';

@Injectable()
export class AutenticacionService {
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly perfiles: PerfilesService,
    private readonly tokens: TokensService,
    private readonly hash: HashService,
    private readonly google: GoogleService,
  ) {}

  async registro(dto: RegistroDto) {
    const existente = await this.usuarios.buscarPorCorreo(dto.correo);
    if (existente) {
      throw new ConflictException('El correo ya está registrado');
    }

    const contrasenaHash = await this.hash.hash(dto.contrasena);
    const usuario = await this.usuarios.crear({ correo: dto.correo, contrasenaHash });

    // Perfil por defecto (pantalla "¿quién está viendo?").
    const perfil = await this.perfiles.crear(usuario.id, { nombre: 'Perfil 1' });

    const tokens = await this.tokens.generarPar({
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    });

    return { usuario: this.aPublico(usuario), perfiles: [perfil], tokens };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuarios.buscarPorCorreoConHash(dto.correo);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Una cuenta creada con Google no tiene contraseña: sin esto, comparar
    // contra null podría dar por buena cualquier cadena según la librería.
    if (!usuario.contrasenaHash) {
      throw new UnauthorizedException('Esta cuenta entra con Google');
    }

    const coincide = await this.hash.comparar(dto.contrasena, usuario.contrasenaHash);
    if (!coincide) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const [tokens, perfiles] = await Promise.all([
      this.tokens.generarPar({
        sub: usuario.id,
        correo: usuario.correo,
        rol: usuario.rol,
      }),
      this.perfiles.listarDeUsuario(usuario.id),
    ]);

    return { usuario: this.aPublico(usuario), perfiles, tokens };
  }

  /**
   * Entra con Google.
   *
   * Si el correo ya existe se enlaza con esa cuenta en vez de crear otra: el
   * correo viene verificado por Google, así que es la misma persona, y
   * rechazarlo la dejaría fuera de su propia cuenta sin explicación. La cuenta
   * conserva su contraseña si la tenía, de modo que puede seguir entrando de
   * las dos formas.
   */
  async entrarConGoogle(idToken: string) {
    const identidad = await this.google.verificar(idToken);

    let usuario = await this.usuarios.buscarPorCorreo(identidad.correo);
    let perfiles: Perfil[];

    if (usuario) {
      if (!usuario.activo) {
        throw new UnauthorizedException('Cuenta no disponible');
      }
      perfiles = await this.perfiles.listarDeUsuario(usuario.id);
    } else {
      // Cuenta nueva: sin contraseña, la identidad la respalda Google.
      usuario = await this.usuarios.crear({
        correo: identidad.correo,
        contrasenaHash: null,
      });
      perfiles = [
        await this.perfiles.crear(usuario.id, {
          nombre: identidad.nombre?.split(' ')[0] || 'Perfil 1',
        }),
      ];
    }

    const tokens = await this.tokens.generarPar({
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    });

    return { usuario: this.aPublico(usuario), perfiles, tokens };
  }

  async refrescar(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.tokens.verificarRefresh(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Tipo de token inválido');
    }

    const valido = await this.tokens.esRefreshValido(payload.sub, payload.jti);
    if (!valido) {
      // Firma válida pero jti ausente => token ya rotado/revocado: posible reuso.
      await this.tokens.revocarTodos(payload.sub);
      throw new UnauthorizedException('Refresh token revocado');
    }

    // Rotación: invalida el actual antes de emitir el nuevo par.
    await this.tokens.revocar(payload.sub, payload.jti);

    const usuario = await this.usuarios.buscarPorId(payload.sub);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Cuenta no disponible');
    }

    const tokens = await this.tokens.generarPar({
      sub: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    });
    return { tokens };
  }

  async logout(refreshToken: string) {
    try {
      const payload = await this.tokens.verificarRefresh(refreshToken);
      await this.tokens.revocar(payload.sub, payload.jti);
    } catch {
      // Idempotente: un token inválido/expirado ya no otorga acceso.
    }
    return { mensaje: 'Sesión cerrada' };
  }

  async seleccionarPerfil(usuarioId: string, correo: string, rol: RolUsuario, perfilId: string) {
    const perfil = await this.perfiles.buscarPropio(usuarioId, perfilId);
    const accessToken = await this.tokens.firmarAccess({
      sub: usuarioId,
      correo,
      rol,
      perfilId: perfil.id,
      esInfantil: perfil.esInfantil,
    });
    return { accessToken, perfil };
  }

  private aPublico(usuario: Usuario) {
    const { contrasenaHash: _omitido, ...publico } = usuario;
    return publico;
  }
}
