import { PartialType } from '@nestjs/swagger';
import { CrearContenidoDto } from './crear-contenido.dto';

/** Todos los campos opcionales; `generoIds` reemplaza el set de géneros si se envía. */
export class ActualizarContenidoDto extends PartialType(CrearContenidoDto) {}
