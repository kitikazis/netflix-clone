import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { JwtAccessGuard } from '@/common/guards/jwt-access.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { paginar, ResultadoPaginado } from '@/common/dto/paginacion.dto';
import { RolUsuario } from './enums/rol-usuario.enum';
import { ConsultarUsuariosDto } from './dto/consultar-usuarios.dto';

/**
 * Listados de solo lectura de las tablas que no tienen su propia pantalla de
 * gestión. Sirven para inspeccionar el estado desde el panel sin abrir el
 * cliente de la base de datos.
 *
 * Son SELECT con paginación: no exponen ninguna operación de escritura, y el
 * hash de contraseña no aparece en ninguna de las consultas.
 */
@ApiTags('admin-tablas')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(RolUsuario.ADMIN)
@Controller('admin/tablas')
export class AdminTablasController {
  constructor(private readonly dataSource: DataSource) {}

  private async paginado<T>(
    sql: string,
    sqlTotal: string,
    parametros: unknown[],
    dto: ConsultarUsuariosDto,
  ): Promise<ResultadoPaginado<T>> {
    const [filas, conteo] = await Promise.all([
      this.dataSource.query<T[]>(`${sql} LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`, [
        ...parametros,
        dto.limite,
        dto.offset,
      ]),
      this.dataSource.query<Array<{ total: string }>>(sqlTotal, parametros),
    ]);
    return paginar(filas, Number(conteo[0].total), dto);
  }

  @ApiOperation({ summary: 'Perfiles de todas las cuentas' })
  @Get('perfiles')
  perfiles(@Query() dto: ConsultarUsuariosDto) {
    const filtro = dto.q ? 'WHERE p.nombre ILIKE $1 OR u.correo ILIKE $1' : '';
    const params = dto.q ? [`%${escaparLike(dto.q)}%`] : [];
    return this.paginado(
      `SELECT p.id, p.nombre, p.es_infantil AS "esInfantil", p.idioma,
              p.fecha_creacion AS "fechaCreacion", u.correo AS "cuenta"
       FROM perfiles p JOIN usuarios u ON u.id = p.usuario_id
       ${filtro} ORDER BY p.fecha_creacion DESC`,
      `SELECT count(*) AS total FROM perfiles p JOIN usuarios u ON u.id = p.usuario_id ${filtro}`,
      params,
      dto,
    );
  }

  @ApiOperation({ summary: 'Episodios de todas las series' })
  @Get('episodios')
  episodios(@Query() dto: ConsultarUsuariosDto) {
    const filtro = dto.q ? 'WHERE e.titulo ILIKE $1 OR c.titulo ILIKE $1' : '';
    const params = dto.q ? [`%${escaparLike(dto.q)}%`] : [];
    return this.paginado(
      `SELECT e.id, e.temporada, e.numero_episodio AS "numeroEpisodio", e.titulo,
              e.duracion_minutos AS "duracionMinutos",
              e.estado_procesamiento AS "estadoProcesamiento",
              c.titulo AS "serie", c.slug AS "serieSlug"
       FROM episodios e JOIN contenido c ON c.id = e.contenido_id
       ${filtro} ORDER BY c.titulo, e.temporada, e.numero_episodio`,
      `SELECT count(*) AS total FROM episodios e JOIN contenido c ON c.id = e.contenido_id ${filtro}`,
      params,
      dto,
    );
  }

  @ApiOperation({ summary: 'Progreso de visualización de todos los perfiles' })
  @Get('progreso')
  progreso(@Query() dto: ConsultarUsuariosDto) {
    return this.paginado(
      `SELECT pv.id, pv.segundo_actual AS "segundoActual",
              pv.duracion_total AS "duracionTotal", pv.completado,
              pv.fecha_actualizacion AS "actualizado",
              p.nombre AS "perfil", c.titulo AS "titulo",
              e.titulo AS "episodio"
       FROM progreso_visualizacion pv
       JOIN perfiles p ON p.id = pv.perfil_id
       JOIN contenido c ON c.id = pv.contenido_id
       LEFT JOIN episodios e ON e.id = pv.episodio_id
       ORDER BY pv.fecha_actualizacion DESC`,
      `SELECT count(*) AS total FROM progreso_visualizacion`,
      [],
      dto,
    );
  }

  @ApiOperation({ summary: 'Géneros con el número de títulos asociados' })
  @Get('generos')
  generos(@Query() dto: ConsultarUsuariosDto) {
    return this.paginado(
      `SELECT g.id, g.nombre, g.slug,
              (SELECT count(*) FROM contenido_generos cg WHERE cg.genero_id = g.id)::int AS "titulos"
       FROM generos g ORDER BY g.nombre`,
      `SELECT count(*) AS total FROM generos`,
      [],
      dto,
    );
  }
}

/** `%` y `_` son comodines de LIKE: sin escaparlos, buscar "%" lo lista todo. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
