import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Perfil } from './entities/perfil.entity';
import { CrearPerfilDto } from './dto/crear-perfil.dto';

@Injectable()
export class PerfilesService {
  /**
   * Un perfil por cuenta.
   *
   * La pantalla de «¿quién está viendo?» tiene sentido en un televisor
   * compartido por una familia; aquí solo añadía un paso entre entrar y ver.
   * Con uno solo, quien entra va directo al catálogo.
   *
   * El modelo sigue admitiendo varios —el progreso cuelga del perfil, no de la
   * cuenta— así que subir este número vuelve a habilitarlos sin tocar nada más.
   */
  private readonly maxPerfiles = 1;

  constructor(
    @InjectRepository(Perfil)
    private readonly repo: Repository<Perfil>,
  ) {}

  listarDeUsuario(usuarioId: string): Promise<Perfil[]> {
    return this.repo.find({ where: { usuarioId }, order: { fechaCreacion: 'ASC' } });
  }

  async crear(usuarioId: string, dto: CrearPerfilDto): Promise<Perfil> {
    const total = await this.repo.count({ where: { usuarioId } });
    if (total >= this.maxPerfiles) {
      throw new ForbiddenException(
        this.maxPerfiles === 1
          ? 'Cada cuenta tiene un único perfil'
          : `Máximo ${this.maxPerfiles} perfiles por cuenta`,
      );
    }
    const perfil = this.repo.create({ ...dto, usuarioId });
    return this.repo.save(perfil);
  }

  /** Devuelve el perfil solo si pertenece a la cuenta; si no, 404. */
  async buscarPropio(usuarioId: string, perfilId: string): Promise<Perfil> {
    const perfil = await this.repo.findOne({ where: { id: perfilId, usuarioId } });
    if (!perfil) {
      throw new NotFoundException('Perfil no encontrado');
    }
    return perfil;
  }

  async eliminar(usuarioId: string, perfilId: string): Promise<void> {
    const perfil = await this.buscarPropio(usuarioId, perfilId);
    await this.repo.remove(perfil);
  }

  /**
   * Pone la foto a los perfiles de la cuenta que no tengan ninguna.
   *
   * Solo rellena huecos. Un avatar que el usuario haya elegido no se toca:
   * entrar con Google no es motivo para cambiárselo.
   */
  async ponerAvatarSiFalta(usuarioId: string, avatarUrl: string): Promise<void> {
    await this.repo.update(
      { usuarioId, avatarUrl: IsNull() },
      { avatarUrl: avatarUrl.slice(0, 500) },
    );
  }
}
