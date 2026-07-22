import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { generarSlug, generarSlugUnico } from '@/common/utils/slug';
import { paginar, ResultadoPaginado } from '@/common/dto/paginacion.dto';
import { Contenido } from './entities/contenido.entity';
import { GenerosService } from './generos.service';
import { CrearContenidoDto } from './dto/crear-contenido.dto';
import { ActualizarContenidoDto } from './dto/actualizar-contenido.dto';
import { ConsultarContenidoDto, OrdenContenido } from './dto/consultar-contenido.dto';

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(Contenido)
    private readonly repo: Repository<Contenido>,
    private readonly generos: GenerosService,
  ) {}

  /**
   * Listado con búsqueda, filtros y paginación.
   * `soloPublicado` lo fuerza el controlador público a `true`; la gestión admin
   * puede pasarlo como `undefined` (todos) o filtrar por `dto.publicado`.
   */
  async listar(
    dto: ConsultarContenidoDto,
    soloPublicado: boolean,
  ): Promise<ResultadoPaginado<Contenido>> {
    const qb = this.repo.createQueryBuilder('c').leftJoinAndSelect('c.generos', 'g');

    if (soloPublicado) {
      qb.andWhere('c.publicado = true');
    } else if (dto.publicado !== undefined) {
      qb.andWhere('c.publicado = :publicado', { publicado: dto.publicado });
    }

    if (dto.tipo) {
      qb.andWhere('c.tipo = :tipo', { tipo: dto.tipo });
    }

    if (dto.destacado !== undefined) {
      qb.andWhere('c.destacado = :destacado', { destacado: dto.destacado });
    }

    if (dto.q) {
      // `%` y `_` son comodines de LIKE: sin escaparlos, buscar "100%" devuelve
      // el catálogo entero. La barra invertida va doble porque dentro de una
      // plantilla `\$` no escapa nada, solo impide la interpolación: la versión
      // anterior insertaba el texto literal "${c}" en la consulta.
      const termino = `%${dto.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      qb.andWhere(
        dto.soloTitulo ? 'c.titulo ILIKE :q' : '(c.titulo ILIKE :q OR c.sinopsis ILIKE :q)',
        { q: termino },
      );
    }

    if (dto.generoSlug) {
      // Subconsulta para no restringir los géneros que se devuelven por cada título.
      qb.andWhere(
        `c.id IN ${qb
          .subQuery()
          .select('sc.id')
          .from(Contenido, 'sc')
          .innerJoin('sc.generos', 'sg')
          .where('sg.slug = :generoSlug')
          .getQuery()}`,
      ).setParameter('generoSlug', dto.generoSlug);
    }

    this.aplicarOrden(qb, dto.orden);
    qb.skip(dto.offset).take(dto.limite);

    const [datos, total] = await qb.getManyAndCount();
    return paginar(datos, total, dto);
  }

  async detallePublicadoPorSlug(slug: string): Promise<Contenido> {
    const contenido = await this.repo.findOne({
      where: { slug, publicado: true },
      relations: { generos: true, episodios: true },
    });
    if (!contenido) {
      throw new NotFoundException('Contenido no encontrado');
    }
    this.ordenarEpisodios(contenido);
    return contenido;
  }

  /** Detalle por id en cualquier estado (gestión admin). */
  async obtenerPorId(id: string): Promise<Contenido> {
    const contenido = await this.repo.findOne({
      where: { id },
      relations: { generos: true, episodios: true },
    });
    if (!contenido) {
      throw new NotFoundException('Contenido no encontrado');
    }
    this.ordenarEpisodios(contenido);
    return contenido;
  }

  async crear(dto: CrearContenidoDto): Promise<Contenido> {
    const slug = await this.resolverSlug(dto.slug ?? dto.titulo);
    const generos = dto.generoIds ? await this.generos.resolverPorIds(dto.generoIds) : [];

    const contenido = this.repo.create({
      tipo: dto.tipo,
      titulo: dto.titulo,
      slug,
      sinopsis: dto.sinopsis ?? null,
      anioLanzamiento: dto.anioLanzamiento ?? null,
      clasificacionEdad: dto.clasificacionEdad ?? null,
      posterUrl: dto.posterUrl ?? null,
      backdropUrl: dto.backdropUrl ?? null,
      duracionMinutos: dto.duracionMinutos ?? null,
      destacado: dto.destacado ?? false,
      publicado: dto.publicado ?? false,
      generos,
    });

    return this.repo.save(contenido);
  }

  async actualizar(id: string, dto: ActualizarContenidoDto): Promise<Contenido> {
    const contenido = await this.obtenerPorId(id);

    // El slug solo cambia si se envía explícitamente (no romper URLs al renombrar).
    if (dto.slug) {
      contenido.slug = await this.resolverSlug(dto.slug, id);
    }
    if (dto.generoIds) {
      contenido.generos = await this.generos.resolverPorIds(dto.generoIds);
    }

    this.asignarSiDefinido(contenido, dto, [
      'tipo',
      'titulo',
      'sinopsis',
      'anioLanzamiento',
      'clasificacionEdad',
      'posterUrl',
      'backdropUrl',
      'duracionMinutos',
      'destacado',
      'publicado',
    ]);

    return this.repo.save(contenido);
  }

  async eliminar(id: string): Promise<void> {
    const contenido = await this.repo.findOne({ where: { id } });
    if (!contenido) {
      throw new NotFoundException('Contenido no encontrado');
    }
    await this.repo.remove(contenido);
  }

  private aplicarOrden(
    qb: ReturnType<Repository<Contenido>['createQueryBuilder']>,
    orden: OrdenContenido,
  ): void {
    switch (orden) {
      case OrdenContenido.TITULO:
        qb.orderBy('c.titulo', 'ASC');
        break;
      case OrdenContenido.ANIO:
        qb.orderBy('c.anioLanzamiento', 'DESC', 'NULLS LAST');
        break;
      case OrdenContenido.RECIENTE:
      default:
        qb.orderBy('c.fechaCreacion', 'DESC');
    }
    // Desempate estable para paginación determinista.
    qb.addOrderBy('c.id', 'ASC');
  }

  private ordenarEpisodios(contenido: Contenido): void {
    contenido.episodios?.sort(
      (a, b) => a.temporada - b.temporada || a.numeroEpisodio - b.numeroEpisodio,
    );
  }

  private resolverSlug(base: string, excluirId?: string): Promise<string> {
    return generarSlugUnico(generarSlug(base), (slug) =>
      this.repo.existsBy(excluirId ? { slug, id: Not(excluirId) } : { slug }),
    );
  }

  /** Copia solo las claves presentes en el DTO (undefined = no tocar). */
  private asignarSiDefinido(
    destino: Contenido,
    origen: ActualizarContenidoDto,
    claves: Array<keyof ActualizarContenidoDto & keyof Contenido>,
  ): void {
    const dst = destino as unknown as Record<string, unknown>;
    const src = origen as unknown as Record<string, unknown>;
    for (const clave of claves) {
      if (src[clave] !== undefined) {
        dst[clave] = src[clave];
      }
    }
  }
}
