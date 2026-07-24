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

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.repo.findOne({ where: { id } });
  }

  crear(datos: {
    correo: string;
    contrasenaHash: string | null;
    nombre?: string | null;
    fotoUrl?: string | null;
    proveedor?: ProveedorRegistro;
  }): Promise<Usuario> {
    const usuario = this.repo.create(datos);
    return this.repo.save(usuario);
  }
}
