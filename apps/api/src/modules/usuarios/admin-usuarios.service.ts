import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginar, PaginacionDto, ResultadoPaginado } from '@/common/dto/paginacion.dto';
import { Usuario } from './entities/usuario.entity';
import { Perfil } from './entities/perfil.entity';
import { RolUsuario } from './enums/rol-usuario.enum';
import { ProveedorRegistro } from './enums/proveedor-registro.enum';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

/** Fila del listado de administración: la cuenta más su número de perfiles. */
export interface UsuarioAdmin {
  id: string;
  correo: string;
  /** Nombre y foto solo los hay si se registró con un proveedor externo. */
  nombre: string | null;
  fotoUrl: string | null;
  proveedor: ProveedorRegistro;
  rol: RolUsuario;
  activo: boolean;
  fechaCreacion: Date;
  perfiles: number;
  /**
   * Ajustes del perfil, traídos a la cuenta.
   *
   * Con un perfil por cuenta, «infantil» e «idioma» son de hecho ajustes de la
   * cuenta; tenerlos en una sección aparte obligaba a cruzar dos listas para
   * saber algo de una sola persona. Si algún día vuelven los perfiles múltiples,
   * aquí se vería el del primero y habría que replantearlo.
   */
  esInfantil: boolean | null;
  idioma: string | null;
}

@Injectable()
export class AdminUsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
    @InjectRepository(Perfil)
    private readonly perfiles: Repository<Perfil>,
  ) {}

  /**
   * Listado paginado de cuentas.
   *
   * `contrasenaHash` tiene `select: false` en la entidad, así que no sale por
   * aquí ni por descuido: para obtenerlo hace falta pedirlo a mano con
   * addSelect, cosa que solo hace el login.
   */
  async listar(dto: PaginacionDto, q?: string): Promise<ResultadoPaginado<UsuarioAdmin>> {
    const qb = this.repo
      .createQueryBuilder('u')
      .loadRelationCountAndMap('u.numPerfiles', 'u.perfiles')
      .leftJoinAndSelect('u.perfiles', 'p')
      .orderBy('u.fechaCreacion', 'DESC')
      .skip(dto.offset)
      .take(dto.limite);

    if (q) {
      // También por nombre: con Google, el correo puede no decir quién es.
      qb.where('u.correo ILIKE :q OR u.nombre ILIKE :q', { q: `%${escaparLike(q)}%` });
    }

    const [filas, total] = await qb.getManyAndCount();
    const datos = filas.map((u) => ({
      id: u.id,
      correo: u.correo,
      nombre: u.nombre,
      fotoUrl: u.fotoUrl,
      proveedor: u.proveedor,
      rol: u.rol,
      activo: u.activo,
      fechaCreacion: u.fechaCreacion,
      perfiles: (u as Usuario & { numPerfiles?: number }).numPerfiles ?? 0,
      esInfantil: u.perfiles?.[0]?.esInfantil ?? null,
      idioma: u.perfiles?.[0]?.idioma ?? null,
    }));
    return paginar(datos, total, dto);
  }

  async actualizar(
    idObjetivo: string,
    idSolicitante: string,
    dto: ActualizarUsuarioDto,
  ): Promise<UsuarioAdmin> {
    const usuario = await this.repo.findOne({ where: { id: idObjetivo } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    // Un administrador no puede quitarse a sí mismo el rol ni desactivarse:
    // es la forma más fácil de quedarse sin acceso a la administración y sin
    // manera de recuperarlo desde la propia aplicación.
    if (idObjetivo === idSolicitante) {
      if (dto.rol && dto.rol !== RolUsuario.ADMIN) {
        throw new BadRequestException('No puedes retirarte a ti mismo el rol de administrador');
      }
      if (dto.activo === false) {
        throw new BadRequestException('No puedes desactivar tu propia cuenta');
      }
    }

    // Y tampoco puede desaparecer el último administrador que quede.
    if (dto.rol === RolUsuario.USUARIO && usuario.rol === RolUsuario.ADMIN) {
      await this.exigirOtroAdmin(idObjetivo);
    }

    if (dto.rol !== undefined) usuario.rol = dto.rol;
    if (dto.activo !== undefined) usuario.activo = dto.activo;
    await this.repo.save(usuario);

    const perfiles = await this.perfiles.count({ where: { usuarioId: usuario.id } });
    return {
      id: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      fotoUrl: usuario.fotoUrl,
      proveedor: usuario.proveedor,
      rol: usuario.rol,
      activo: usuario.activo,
      fechaCreacion: usuario.fechaCreacion,
      perfiles,
      esInfantil: null,
      idioma: null,
    };
  }

  async eliminar(idObjetivo: string, idSolicitante: string): Promise<void> {
    if (idObjetivo === idSolicitante) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }
    const usuario = await this.repo.findOne({ where: { id: idObjetivo } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.rol === RolUsuario.ADMIN) await this.exigirOtroAdmin(idObjetivo);

    // Perfiles y progreso caen por las claves foráneas en cascada.
    await this.repo.remove(usuario);
  }

  private async exigirOtroAdmin(excluyendo: string): Promise<void> {
    const otros = await this.repo
      .createQueryBuilder('u')
      .where('u.rol = :rol', { rol: RolUsuario.ADMIN })
      .andWhere('u.id != :id', { id: excluyendo })
      .getCount();
    if (otros === 0) {
      throw new BadRequestException('Debe quedar al menos un administrador');
    }
  }
}

/** `%` y `_` son comodines de LIKE: buscar "100%" no debe listar todo. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
