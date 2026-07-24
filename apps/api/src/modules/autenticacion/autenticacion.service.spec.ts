import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { UsuariosService } from '@/modules/usuarios/usuarios.service';
import { PerfilesService } from '@/modules/usuarios/perfiles.service';
import { TokensService } from './tokens.service';
import { HashService } from './hash.service';
import { GoogleService } from './google.service';

type Mock<T> = { [K in keyof T]: jest.Mock };

describe('AutenticacionService', () => {
  let service: AutenticacionService;
  let usuarios: Mock<UsuariosService>;
  let perfiles: Mock<PerfilesService>;
  let tokens: Mock<TokensService>;
  let hash: Mock<HashService>;
  // Solo `verificar`: es lo único que el servicio le pide.
  let google: { verificar: jest.Mock };

  const parTokens = { accessToken: 'access.jwt', refreshToken: 'refresh.jwt' };
  const usuarioMock = {
    id: 'u-1',
    correo: 'ana@correo.com',
    contrasenaHash: 'hash',
    activo: true,
  };

  beforeEach(() => {
    usuarios = {
      buscarPorCorreo: jest.fn(),
      buscarPorCorreoConHash: jest.fn(),
      buscarPorId: jest.fn(),
      crear: jest.fn(),
      completarDesdeProveedor: jest.fn(),
    };
    perfiles = {
      crear: jest.fn(),
      listarDeUsuario: jest.fn(),
      buscarPropio: jest.fn(),
      eliminar: jest.fn(),
      ponerAvatarSiFalta: jest.fn(),
    };
    tokens = {
      generarPar: jest.fn().mockResolvedValue(parTokens),
      firmarAccess: jest.fn(),
      verificarRefresh: jest.fn(),
      esRefreshValido: jest.fn(),
      revocar: jest.fn(),
      revocarTodos: jest.fn(),
    };
    hash = {
      hash: jest.fn(),
      comparar: jest.fn(),
    };
    // La verificación del token de Google tiene su propia suite; aquí solo se
    // necesita que la dependencia exista.
    google = { verificar: jest.fn() };

    service = new AutenticacionService(
      usuarios as unknown as UsuariosService,
      perfiles as unknown as PerfilesService,
      tokens as unknown as TokensService,
      hash as unknown as HashService,
      google as unknown as GoogleService,
    );
  });

  describe('registro', () => {
    it('crea la cuenta, hashea la contraseña y devuelve tokens sin exponer el hash', async () => {
      usuarios.buscarPorCorreo.mockResolvedValue(null);
      hash.hash.mockResolvedValue('hash-generado');
      usuarios.crear.mockResolvedValue({ ...usuarioMock, contrasenaHash: 'hash-generado' });
      perfiles.crear.mockResolvedValue({ id: 'p-1', nombre: 'Perfil 1' });

      const res = await service.registro({ correo: 'ana@correo.com', contrasena: '12345678' });

      expect(hash.hash).toHaveBeenCalledWith('12345678');
      expect(usuarios.crear).toHaveBeenCalledWith({
        correo: 'ana@correo.com',
        contrasenaHash: 'hash-generado',
      });
      expect(perfiles.crear).toHaveBeenCalledWith('u-1', { nombre: 'Perfil 1' });
      expect(res.tokens).toEqual(parTokens);
      expect((res.usuario as Record<string, unknown>).contrasenaHash).toBeUndefined();
    });

    it('lanza ConflictException si el correo ya existe', async () => {
      usuarios.buscarPorCorreo.mockResolvedValue(usuarioMock);

      await expect(
        service.registro({ correo: 'ana@correo.com', contrasena: '12345678' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usuarios.crear).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('devuelve tokens y perfiles con credenciales válidas', async () => {
      usuarios.buscarPorCorreoConHash.mockResolvedValue(usuarioMock);
      hash.comparar.mockResolvedValue(true);
      perfiles.listarDeUsuario.mockResolvedValue([{ id: 'p-1' }]);

      const res = await service.login({ correo: 'ana@correo.com', contrasena: '12345678' });

      expect(hash.comparar).toHaveBeenCalledWith('12345678', 'hash');
      expect(res.tokens).toEqual(parTokens);
      expect(res.perfiles).toHaveLength(1);
    });

    it('lanza UnauthorizedException si la contraseña no coincide', async () => {
      usuarios.buscarPorCorreoConHash.mockResolvedValue(usuarioMock);
      hash.comparar.mockResolvedValue(false);

      await expect(
        service.login({ correo: 'ana@correo.com', contrasena: 'mala' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokens.generarPar).not.toHaveBeenCalled();
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usuarios.buscarPorCorreoConHash.mockResolvedValue(null);

      await expect(
        service.login({ correo: 'nadie@correo.com', contrasena: '12345678' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refrescar', () => {
    it('rota los tokens cuando el jti está en la allowlist', async () => {
      tokens.verificarRefresh.mockResolvedValue({ sub: 'u-1', jti: 'j-1', type: 'refresh' });
      tokens.esRefreshValido.mockResolvedValue(true);
      usuarios.buscarPorId.mockResolvedValue(usuarioMock);

      const res = await service.refrescar('refresh.jwt');

      expect(tokens.revocar).toHaveBeenCalledWith('u-1', 'j-1');
      expect(tokens.generarPar).toHaveBeenCalled();
      expect(res.tokens).toEqual(parTokens);
    });

    it('revoca toda la cuenta y falla si el jti no está (reuso)', async () => {
      tokens.verificarRefresh.mockResolvedValue({ sub: 'u-1', jti: 'viejo', type: 'refresh' });
      tokens.esRefreshValido.mockResolvedValue(false);

      await expect(service.refrescar('refresh.jwt')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokens.revocarTodos).toHaveBeenCalledWith('u-1');
      expect(tokens.generarPar).not.toHaveBeenCalled();
    });
  });
});
