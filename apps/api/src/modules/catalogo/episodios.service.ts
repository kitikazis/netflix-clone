import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contenido } from './entities/contenido.entity';
import { Episodio } from './entities/episodio.entity';
import { TipoContenido } from './enums/tipo-contenido.enum';
import { CrearEpisodioDto } from './dto/crear-episodio.dto';
import { ActualizarEpisodioDto } from './dto/actualizar-episodio.dto';

@Injectable()
export class EpisodiosService {
  constructor(
    @InjectRepository(Episodio)
    private readonly repo: Repository<Episodio>,
    @InjectRepository(Contenido)
    private readonly contenidoRepo: Repository<Contenido>,
  ) {}

  async listarDeContenido(contenidoId: string, soloPublicada = false): Promise<Episodio[]> {
    await this.exigirSerie(contenidoId, soloPublicada);
    return this.repo.find({
      where: { contenidoId },
      order: { temporada: 'ASC', numeroEpisodio: 'ASC' },
    });
  }

  async obtener(id: string): Promise<Episodio> {
    const episodio = await this.repo.findOne({ where: { id } });
    if (!episodio) {
      throw new NotFoundException('Episodio no encontrado');
    }
    return episodio;
  }

  async crear(contenidoId: string, dto: CrearEpisodioDto): Promise<Episodio> {
    await this.exigirSerie(contenidoId);
    await this.exigirCombinacionLibre(contenidoId, dto.temporada, dto.numeroEpisodio);

    const episodio = this.repo.create({
      contenidoId,
      temporada: dto.temporada,
      numeroEpisodio: dto.numeroEpisodio,
      titulo: dto.titulo,
      sinopsis: dto.sinopsis ?? null,
      duracionMinutos: dto.duracionMinutos ?? null,
    });
    return this.repo.save(episodio);
  }

  async actualizar(id: string, dto: ActualizarEpisodioDto): Promise<Episodio> {
    const episodio = await this.obtener(id);

    const nuevaTemporada = dto.temporada ?? episodio.temporada;
    const nuevoNumero = dto.numeroEpisodio ?? episodio.numeroEpisodio;
    const cambiaClave =
      nuevaTemporada !== episodio.temporada || nuevoNumero !== episodio.numeroEpisodio;
    if (cambiaClave) {
      await this.exigirCombinacionLibre(episodio.contenidoId, nuevaTemporada, nuevoNumero, id);
    }

    if (dto.temporada !== undefined) episodio.temporada = dto.temporada;
    if (dto.numeroEpisodio !== undefined) episodio.numeroEpisodio = dto.numeroEpisodio;
    if (dto.titulo !== undefined) episodio.titulo = dto.titulo;
    if (dto.sinopsis !== undefined) episodio.sinopsis = dto.sinopsis;
    if (dto.duracionMinutos !== undefined) episodio.duracionMinutos = dto.duracionMinutos;

    return this.repo.save(episodio);
  }

  async eliminar(id: string): Promise<void> {
    const episodio = await this.obtener(id);
    await this.repo.remove(episodio);
  }

  /** Carga el contenido y verifica que exista y sea una serie. */
  private async exigirSerie(contenidoId: string, soloPublicada = false): Promise<Contenido> {
    const contenido = await this.contenidoRepo.findOne({ where: { id: contenidoId } });
    // En contexto público, una serie no publicada no debe revelar su existencia.
    if (!contenido || (soloPublicada && !contenido.publicado)) {
      throw new NotFoundException('Contenido no encontrado');
    }
    if (contenido.tipo !== TipoContenido.SERIE) {
      throw new BadRequestException('Solo las series pueden tener episodios');
    }
    return contenido;
  }

  private async exigirCombinacionLibre(
    contenidoId: string,
    temporada: number,
    numeroEpisodio: number,
    excluirId?: string,
  ): Promise<void> {
    const existe = await this.repo.exists({
      where: { contenidoId, temporada, numeroEpisodio },
    });
    if (existe) {
      // Reconsultamos excluyendo el propio registro (al actualizar).
      const otro = await this.repo.findOne({
        where: { contenidoId, temporada, numeroEpisodio },
        select: { id: true },
      });
      if (otro && otro.id !== excluirId) {
        throw new ConflictException(
          `Ya existe el episodio T${temporada}xE${numeroEpisodio} en esta serie`,
        );
      }
    }
  }
}
