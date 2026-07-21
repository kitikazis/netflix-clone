import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

/**
 * Aísla el hashing de contraseñas (bcryptjs). Estar detrás de un servicio permite
 * mockearlo en tests y cambiar el algoritmo (p.ej. argon2) sin tocar la lógica de auth.
 */
@Injectable()
export class HashService {
  private readonly rondas = 12;

  hash(texto: string): Promise<string> {
    return bcrypt.hash(texto, this.rondas);
  }

  comparar(texto: string, hash: string): Promise<boolean> {
    return bcrypt.compare(texto, hash);
  }
}
