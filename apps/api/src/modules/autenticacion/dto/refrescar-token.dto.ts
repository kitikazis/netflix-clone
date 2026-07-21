import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefrescarTokenDto {
  @ApiProperty({ description: 'Refresh token emitido en login/registro' })
  @IsJWT()
  @IsNotEmpty()
  refreshToken: string;
}
