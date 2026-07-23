/**
 * Reorganiza el bucket a la estructura nueva (una sola vez).
 *
 *   <uuid>/master.m3u8            →  hls/<slug>/master.m3u8
 *   <uuid>/t1e2/master.m3u8       →  hls/<slug>/t1e2/master.m3u8
 *   <algo>.mp4  (suelto en raíz)  →  origen/<fecha>/<archivo>
 *
 * Y deja `hlsPlaylistUrl` apuntando al sitio nuevo.
 *
 * Se hace en tres pasos y en este orden: copiar, comprobar que la copia está,
 * actualizar la base y solo entonces borrar el original. Si algo se tuerce a
 * mitad, lo peor que queda son objetos duplicados; nunca un título apuntando a
 * un sitio que ya no existe.
 *
 *   node scripts/reorganizar-almacenamiento.mjs           (simulación)
 *   node scripts/reorganizar-almacenamiento.mjs --aplicar
 */
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import pg from 'pg';

const APLICAR = process.argv.includes('--aplicar');
const BUCKET = process.env.R2_BUCKET;
const PUBLICA = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/\/+$/, '');

const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'auto',
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function listarTodo() {
  const claves = [];
  let token;
  do {
    const r = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }),
    );
    claves.push(...(r.Contents ?? []).map((o) => ({ clave: o.Key, fecha: o.LastModified })));
    token = r.NextContinuationToken;
  } while (token);
  return claves;
}

/** slug de cada título y de cada episodio, por id. */
async function leerCatalogo(sql) {
  const destinos = new Map();
  const { rows: peliculas } = await sql.query('SELECT id, slug FROM contenido');
  for (const p of peliculas) destinos.set(p.id, `hls/${p.slug}`);

  const { rows: episodios } = await sql.query(
    `SELECT e.id, c.slug, e.temporada, e.numero_episodio
       FROM episodios e JOIN contenido c ON c.id = e.contenido_id`,
  );
  for (const e of episodios) {
    destinos.set(e.id, `hls/${e.slug}/t${e.temporada}e${e.numero_episodio}`);
  }
  return destinos;
}

function claveNueva({ clave, fecha }, destinos) {
  const [raiz, ...resto] = clave.split('/');

  // Ya está ordenado.
  if (raiz === 'hls' || raiz === 'origen') return null;

  // Carpeta con el UUID del activo: es HLS publicado.
  if (UUID.test(raiz)) {
    const destino = destinos.get(raiz);
    if (!destino) return null; // el título ya no existe: se deja como está
    return `${destino}/${resto.join('/')}`;
  }

  // Archivo suelto en la raíz: material de origen subido a mano. Se agrupa por
  // el día en que se subió, que es lo que dice la fecha del propio objeto.
  if (resto.length === 0) {
    const dia = (fecha ?? new Date()).toISOString().slice(0, 10);
    return `${'origen'}/${dia}/${raiz}`;
  }
  return null;
}

async function main() {
  if (!BUCKET || !process.env.S3_ENDPOINT) {
    throw new Error('Faltan R2_BUCKET / S3_ENDPOINT en el entorno');
  }
  if (!PUBLICA) {
    throw new Error('Falta R2_PUBLIC_BASE_URL: sin ella no se puede reapuntar la base');
  }

  // Mismas variables que usa la API (ver config/configuration.ts).
  const sql = new pg.Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await sql.connect();

  const destinos = await leerCatalogo(sql);
  const claves = await listarTodo();
  const movimientos = claves
    .map((o) => ({ de: o.clave, a: claveNueva(o, destinos) }))
    .filter((m) => m.a);

  console.log(`${claves.length} objetos en el bucket, ${movimientos.length} por mover`);
  for (const m of movimientos) console.log(`  ${m.de}\n    → ${m.a}`);

  if (!APLICAR) {
    console.log('\nSimulación. Vuelve a lanzarlo con --aplicar para hacerlo de verdad.');
    await sql.end();
    return;
  }

  // 1) Copiar.
  for (const m of movimientos) {
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${m.de}`,
        Key: m.a,
      }),
    );
  }
  console.log(`\ncopiados ${movimientos.length}`);

  // 2) Comprobar que están todos antes de tocar nada más.
  for (const m of movimientos) {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: m.a }));
  }
  console.log('verificados');

  // 3) Reapuntar la base: solo las playlists maestras se guardan en una fila.
  let filas = 0;
  for (const m of movimientos.filter((x) => x.de.endsWith('master.m3u8'))) {
    const nueva = `${PUBLICA}/${m.a}`;
    for (const tabla of ['contenido', 'episodios']) {
      const r = await sql.query(
        `UPDATE ${tabla} SET hls_playlist_url = $1 WHERE hls_playlist_url LIKE $2`,
        [nueva, `%/${m.de}`],
      );
      filas += r.rowCount;
    }
  }
  console.log(`filas reapuntadas: ${filas}`);

  // 4) Ahora sí, borrar los originales.
  for (const m of movimientos) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: m.de }));
  }
  console.log(`borrados ${movimientos.length} originales`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
