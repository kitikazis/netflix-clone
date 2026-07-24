import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { ProveedorRegistro } from './enums/proveedor-registro.enum';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
  ) {}

  buscarPorCorreo(correo: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { correo } });
  }

  /** Incluye contrasenaHash (que por defecto tiene select:false). Solo para login. */
  buscarPorCorreoConHash(correo: string): Promise<Usuario | null> {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.contrasenaHash')
      .where('u.correo = :correo', { correo })
      .getOne();
  }

  buscarPorTelefono(telefono: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { telefono } });
  }

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id } });
  }

  crear(datos: {
    correo?: string | null;
    telefono?: string | null;
    contrasenaHash: string | null;
    nombre?: string | null;
    fotoUrl?: string | null;
    proveedor?: ProveedorRegistro;
  }): Promise<Usuario> {
    const usuario = this.repo.create(datos);
    return this.repo.save(usuario);
  }

  /**
   * Rellena nombre y foto si la cuenta no los tenía.
   *
   * Solo rellena huecos, nunca sobrescribe: si el usuario ya tiene algo
   * guardado es porque vino de antes o lo puso él, y no le corresponde a un
   * inicio de sesión cambiárselo.
   */
  async completarDesdeProveedor(
    id: string,
    datos: { nombre?: string; fotoUrl?: string },
  ): Promise<void> {
    const usuario = await this.repo.findOne({ where: { id } });
    if (!usuario) return;

    const cambios: Partial<Usuario> = {};
    if (!usuario.nombre && datos.nombre) cambios.nombre = datos.nombre.slice(0, 120);
    if (!usuario.fotoUrl && datos.fotoUrl) cambios.fotoUrl = datos.fotoUrl.slice(0, 500);
    // Una cuenta sin contraseña que entra con Google es, de hecho, de Google:
    // suele ser una creada antes de que se guardara el proveedor.
    if (usuario.proveedor === ProveedorRegistro.LOCAL && !usuario.contrasenaHash) {
      cambios.proveedor = ProveedorRegistro.GOOGLE;
    }

    if (Object.keys(cambios).length > 0) {
      await this.repo.update({ id }, cambios);
    }
  }
}
