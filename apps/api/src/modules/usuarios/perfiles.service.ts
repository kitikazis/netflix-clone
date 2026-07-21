import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Perfil } from './entities/perfil.entity';
import { CrearPerfilDto } from './dto/crear-perfil.dto';

@Injectable()
export class PerfilesService {
  private readonly maxPerfiles = 5;

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
      throw new ForbiddenException(`Máximo ${this.maxPerfiles} perfiles por cuenta`);
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
}
