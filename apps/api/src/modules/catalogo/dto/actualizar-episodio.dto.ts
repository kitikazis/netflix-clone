import { PartialType } from '@nestjs/swagger';
import { CrearEpisodioDto } from './crear-episodio.dto';

export class ActualizarEpisodioDto extends PartialType(CrearEpisodioDto) {}
