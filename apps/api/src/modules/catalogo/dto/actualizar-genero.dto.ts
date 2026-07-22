import { PartialType } from '@nestjs/swagger';
import { CrearGeneroDto } from './crear-genero.dto';

export class ActualizarGeneroDto extends PartialType(CrearGeneroDto) {}
