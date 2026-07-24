import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString } from 'class-validator';

export class GoogleDto {
  @ApiProperty({ description: 'ID token que Google entrega al navegador' })
  @IsString()
  @IsJWT()
  idToken: string;
}
