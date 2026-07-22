import { NotFoundException } from '@nestjs/common';
import { ProgresoVisualizacionService } from './progreso-visualizacion.service';

type Mock<T> = { [K in keyof T]: jest.Mock };

/**
 * Pruebas del progreso de visualización.
 *
 * Lo que se comprueba aquí es lo que no se ve mirando la pantalla: que el
 * estado caliente se escriba siempre, que la persistencia en Postgres esté
 * limitada por la ventana de throttle, y que las lecturas prefieran Redis pero
 * sepan caer a la base cuando no hay nada.
 */
describe('ProgresoVisualizacionService', () => {
  let service: ProgresoVisualizacionService;
  let repo: Mock<{
    find: unknown;
    findOne: unknown;
    save: unknown;
    create: unknown;
    delete: unknown;
  }>;
  let contenidoRepo: Mock<{ exists: unknown }>;
  let episodioRepo: Mock<{ findOne: unknown }>;
  let redis: Mock<{ set: unknown; get: unknown; mget: unknown; del: unknown }>;

  const PERFIL = 'p-1';
  const CONTENIDO = 'c-1';

  beforeEach(() => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((x: unknown) => Promise.resolve(x)),
      create: jest.fn().mockImplementation((x: unknown) => x),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    contenidoRepo = { exists: jest.fn().mockResolvedValue(true) };
    episodioRepo = { findOne: jest.fn() };
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      mget: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
    };

    service = new ProgresoVisualizacionService(
      repo as never,
      contenidoRepo as never,
      episodioRepo as never,
      redis as never,
    );
  });

  describe('guardar', () => {
    it('escribe el estado caliente en cada latido', async () => {
      await service.guardar(PERFIL, {
        contenidoId: CONTENIDO,
        segundoActual: 30,
        duracionTotal: 600,
      });

      const [clave, valor, modo, ttl] = redis.set.mock.calls[0] as [string, string, string, number];
      expect(clave).toBe(`pv:${PERFIL}:${CONTENIDO}:_`);
      expect(JSON.parse(valor)).toEqual({ s: 30, d: 600, c: false });
      expect(modo).toBe('EX');
      expect(ttl).toBe(60 * 60 * 24 * 30);
    });

    it('marca completado a partir del 90 % y lo persiste sin esperar al throttle', async () => {
      const r = await service.guardar(PERFIL, {
        contenidoId: CONTENIDO,
        segundoActual: 540,
        duracionTotal: 600,
      });

      expect(r.completado).toBe(true);
      expect(repo.save).toHaveBeenCalled();
      // La clave de throttle ni se consulta: completar siempre persiste.
      expect(redis.set).toHaveBeenCalledTimes(1);
    });

    it('no persiste si el throttle sigue vigente', async () => {
      // El SET NX devuelve null cuando la clave ya existe.
      redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

      await service.guardar(PERFIL, {
        contenidoId: CONTENIDO,
        segundoActual: 30,
        duracionTotal: 600,
      });

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('nunca deja la posición por encima de la duración', async () => {
      const r = await service.guardar(PERFIL, {
        contenidoId: CONTENIDO,
        segundoActual: 9999,
        duracionTotal: 600,
      });
      expect(r.segundoActual).toBe(600);
      expect(r.porcentaje).toBe(100);
    });

    it('rechaza un contenido inexistente antes de tocar Redis', async () => {
      contenidoRepo.exists.mockResolvedValue(false);
      await expect(
        service.guardar(PERFIL, {
          contenidoId: 'no-existe',
          segundoActual: 10,
          duracionTotal: 100,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('rechaza un episodio que no pertenece al contenido', async () => {
      episodioRepo.findOne.mockResolvedValue({ id: 'e-1', contenidoId: 'otro' });
      await expect(
        service.guardar(PERFIL, {
          contenidoId: CONTENIDO,
          episodioId: 'e-1',
          segundoActual: 10,
          duracionTotal: 100,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('posicion', () => {
    it('prefiere el estado caliente de Redis', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ s: 120, d: 600, c: false }));
      const pos = await service.posicion(PERFIL, CONTENIDO);
      expect(pos).toEqual({
        segundoActual: 120,
        duracionTotal: 600,
        completado: false,
        porcentaje: 20,
      });
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('cae a Postgres cuando Redis no tiene nada', async () => {
      repo.findOne.mockResolvedValue({
        segundoActual: 45,
        duracionTotal: 300,
        completado: false,
      });
      const pos = await service.posicion(PERFIL, CONTENIDO);
      expect(pos?.segundoActual).toBe(45);
    });

    it('devuelve null si no hay progreso en ninguno de los dos', async () => {
      expect(await service.posicion(PERFIL, CONTENIDO)).toBeNull();
    });

    it('sobrevive a un valor corrupto en Redis', async () => {
      redis.get.mockResolvedValue('esto no es json');
      repo.findOne.mockResolvedValue(null);
      expect(await service.posicion(PERFIL, CONTENIDO)).toBeNull();
    });
  });

  describe('continuarViendo', () => {
    const fila = (id: string, seg: number) => ({
      id,
      perfilId: PERFIL,
      contenidoId: `c-${id}`,
      episodioId: null,
      segundoActual: seg,
      duracionTotal: 600,
      completado: false,
      fechaActualizacion: new Date(),
      contenido: { id: `c-${id}`, slug: id, titulo: id, tipo: 'PELICULA' },
      episodio: null,
    });

    it('sobre-consulta y recorta al límite pedido', async () => {
      repo.find.mockResolvedValue([fila('a', 10), fila('b', 20), fila('c', 30)]);
      redis.mget.mockResolvedValue([null, null, null]);

      const items = await service.continuarViendo(PERFIL, 2);

      // Pide el triple para tener margen tras descartar los completados.
      const llamadas = repo.find.mock.calls as [{ take: number }][];
      expect(llamadas[0][0].take).toBe(6);
      expect(items).toHaveLength(2);
    });

    it('descarta los que Redis marca completados aunque Postgres no lo sepa', async () => {
      repo.find.mockResolvedValue([fila('a', 10), fila('b', 20)]);
      redis.mget.mockResolvedValue([JSON.stringify({ s: 590, d: 600, c: true }), null]);

      const items = await service.continuarViendo(PERFIL, 10);
      expect(items).toHaveLength(1);
      expect(items[0]?.contenido.slug).toBe('b');
    });

    it('lee el estado caliente de una sola vez, no una consulta por fila', async () => {
      repo.find.mockResolvedValue([fila('a', 10), fila('b', 20), fila('c', 30)]);
      redis.mget.mockResolvedValue([null, null, null]);

      await service.continuarViendo(PERFIL, 10);

      expect(redis.mget).toHaveBeenCalledTimes(1);
      expect(redis.get).not.toHaveBeenCalled();
    });

    it('no consulta Redis cuando no hay filas', async () => {
      repo.find.mockResolvedValue([]);
      await service.continuarViendo(PERFIL, 10);
      expect(redis.mget).not.toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('borra también el estado caliente', async () => {
      await service.eliminar(PERFIL, CONTENIDO);
      expect(redis.del).toHaveBeenCalledWith(`pv:${PERFIL}:${CONTENIDO}:_`);
    });
  });
});
