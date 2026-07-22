import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { generarSlug, generarSlugUnico } from '@/common/utils/slug';
import { Genero } from './entities/genero.entity';
import { CrearGeneroDto } from './dto/crear-genero.dto';
import { ActualizarGeneroDto } from './dto/actualizar-genero.dto';

@Injectable()
export class GenerosService {
  constructor(
    @InjectRepository(Genero)
    private readonly repo: Repository<Genero>,
  ) {}

  listar(): Promise<Genero[]> {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  async buscarPorSlug(slug: string): Promise<Genero> {
    const genero = await this.repo.findOne({ where: { slug } });
    if (!genero) {
      throw new NotFoundException('Género no encontrado');
    }
    return genero;
  }

  async buscarPorId(id: string): Promise<Genero> {
    const genero = await this.repo.findOne({ where: { id } });
    if (!genero) {
      throw new NotFoundException('Género no encontrado');
    }
    return genero;
  }

  /** Resuelve un conjunto de IDs a entidades; falla si alguno no existe. */
  async resolverPorIds(ids: string[]): Promise<Genero[]> {
    if (ids.length === 0) return [];
    const generos = await this.repo.findBy({ id: In(ids) });
    if (generos.length !== new Set(ids).size) {
      throw new NotFoundException('Uno o más géneros no existen');
    }
    return generos;
  }

  async crear(dto: CrearGeneroDto): Promise<Genero> {
    const nombreTomado = await this.repo.existsBy({ nombre: dto.nombre });
    if (nombreTomado) {
      throw new ConflictException('Ya existe un género con ese nombre');
    }
    const slug = await this.resolverSlug(dto.slug ?? dto.nombre);
    const genero = this.repo.create({ nombre: dto.nombre, slug });
    return this.repo.save(genero);
  }

  async actualizar(id: string, dto: ActualizarGeneroDto): Promise<Genero> {
    const genero = await this.buscarPorId(id);

    if (dto.nombre && dto.nombre !== genero.nombre) {
      const tomado = await this.repo.existsBy({ nombre: dto.nombre, id: Not(id) });
      if (tomado) {
        throw new ConflictException('Ya existe un género con ese nombre');
      }
      genero.nombre = dto.nombre;
    }

    if (dto.slug) {
      genero.slug = await this.resolverSlug(dto.slug, id);
    }

    return this.repo.save(genero);
  }

  async eliminar(id: string): Promise<void> {
    const genero = await this.buscarPorId(id);
    await this.repo.remove(genero);
  }

  private resolverSlug(base: string, excluirId?: string): Promise<string> {
    return generarSlugUnico(generarSlug(base), (slug) =>
      this.repo.existsBy(excluirId ? { slug, id: Not(excluirId) } : { slug }),
    );
  }
}
