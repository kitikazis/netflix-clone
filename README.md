# Netflix Clone

Production-grade practice project. Monorepo (npm workspaces).

- **`apps/api`** — NestJS backend (TypeScript, modular architecture).
- **`apps/web`** — Next.js frontend (shell mínimo con SSR; catálogo/reproductor en Fases 4/7).
- `packages/shared` — shared types/DTOs _(later)_.

> Nota: todo el modelo de datos (entidades, DTOs, columnas, migraciones) y los
> módulos están nombrados **en español**.

## Stack

| Concern        | Choice                                   |
| -------------- | ---------------------------------------- |
| Backend        | NestJS 11 (TypeScript)                   |
| Database / ORM | PostgreSQL 16 + **TypeORM** (migrations) |
| Cache/sessions | Redis 7 (ioredis)                        |
| Background jobs| BullMQ _(Phase 5)_                       |
| Frontend       | Next.js + HLS.js _(Phase 7)_             |
| Transcoding    | ffmpeg → HLS _(Phase 5)_                 |
| Storage        | Cloudflare R2 (S3 API) _(Phase 6)_       |

## Prerequisites

- Node.js >= 22, npm >= 11
- Docker (for Postgres + Redis)

## Getting started

```bash
# 1. Install deps (from repo root — installs all workspaces)
npm install

# 2. Start infrastructure (Postgres + Redis)
npm run infra:up

# 3. Configure API env
cp apps/api/.env.example apps/api/.env   # adjust if needed

# 4. Aplicar migraciones (crea el esquema en Postgres)
npm run migration:run --workspace @netflix-clone/api

# 5. Run the API in watch mode
npm run dev:api

# 6. (Opcional) Front mínimo con SSR
npm run dev --workspace @netflix-clone/web
```

- API:      http://localhost:3000/api/v1
- Health:   http://localhost:3000/api/v1/health
- Swagger:  http://localhost:3000/docs
- Web:      http://localhost:3001

## Migrations (TypeORM)

Run from `apps/api`:

```bash
npm run migration:generate -- src/database/migrations/<Name>
npm run migration:run
npm run migration:revert
npm run migration:show
```

## Architecture notes

- **Config** is validated at boot (`src/config/env.validation.ts`); a bad/missing env var aborts startup. Typed slices via `registerAs` (`app`, `database`, `redis`, `jwt`).
- **DB**: `synchronize: false` everywhere — schema only ever changes through versioned migrations. `SnakeNamingStrategy` for Postgres-idiomatic column names.
- **Redis** is a global module exposing a shared ioredis client (`REDIS_CLIENT` token) with graceful shutdown.
- **Cross-cutting**: global `ValidationPipe`, response-envelope interceptor, catch-all exception filter, Terminus health checks (DB + Redis).

## Build phases

1. ✅ Project setup + module structure + config (Postgres + Redis)
2. ✅ Entidades & migraciones (usuarios, perfiles, contenido, episodios, generos, progreso_visualizacion)
   - ➕ Front mínimo `apps/web` (SSR de estado del sistema) — adelantado
3. ✅ Multi-profile auth (JWT + refresh)
4. ✅ Catalog API (CRUD + search + pagination) — lecturas públicas + gestión admin (rol `ADMIN`)
5. ✅ Video pipeline (BullMQ + ffmpeg → HLS multi-bitrate; almacenamiento local, R2-ready)
6. ✅ Upload + Cloudflare R2 storage (subidas prefirmadas; driver `local`/`r2` seleccionable)
7. ✅ Next.js frontend (SSR catalog + ficha + reproductor HLS.js) — estética VHS
8. ✅ Continue watching + history (Redis hot state + Postgres durable)

## Catálogo & vídeo (Fases 4–5)

**Autorización.** Las cuentas tienen un rol (`USUARIO` | `ADMIN`), incluido en el
access token. Las lecturas del catálogo son públicas (solo devuelven contenido
`publicado`); crear/editar/borrar y encolar transcodificaciones exigen rol `ADMIN`
(`JwtAccessGuard` + `RolesGuard` + `@Roles`). Para promover una cuenta a admin en
dev: `UPDATE usuarios SET rol = 'ADMIN' WHERE correo = '...';`.

**Endpoints (bajo `/api/v1`):**

| Método | Ruta | Acceso |
| ------ | ---- | ------ |
| GET | `/catalogo/contenido` (búsqueda `q`, `tipo`, `generoSlug`, `destacado`, `orden`, `pagina`, `limite`) | público |
| GET | `/catalogo/contenido/:slug` | público |
| GET | `/catalogo/generos` · `/catalogo/generos/:slug` | público |
| GET | `/catalogo/contenido/:contenidoId/episodios` · `/catalogo/episodios/:id` | público |
| POST/PATCH/DELETE | `/admin/catalogo/contenido/...` · `/catalogo/generos` · `/catalogo/.../episodios` | admin |
| POST | `/admin/procesamiento/contenido/:id` · `/admin/procesamiento/episodios/:id` | admin |

**Pipeline de vídeo.** `POST /admin/procesamiento/...` con `{ "claveOrigen": "peliculas/x.mp4" }`
encola un job BullMQ (202). El worker (ffmpeg estático empaquetado) transcodifica a HLS
VOD multi-bitrate, publica la salida y actualiza `estadoProcesamiento` →
`EN_COLA`/`PROCESANDO`/`LISTO`/`ERROR` y `hlsPlaylistUrl` en el propio recurso.

Probar en local:

```bash
# 1. Coloca un vídeo fuente
mkdir -p apps/api/storage/source/peliculas && cp mi-video.mp4 apps/api/storage/source/peliculas/

# 2. Encola (como admin): POST /api/v1/admin/procesamiento/contenido/<id>  { "claveOrigen": "peliculas/mi-video.mp4" }
# 3. Cuando estadoProcesamiento sea LISTO, el master estará en:
#    http://localhost:3000/media/<id>/master.m3u8
```

## Subida & almacenamiento (Fase 6)

El almacenamiento se abstrae detrás de un contrato único (`Almacenamiento`) y se
elige con `STORAGE_DRIVER`:

- **`local`** (por defecto): origen en `MEDIA_SOURCE_DIR`, HLS servido desde disco.
- **`r2`**: Cloudflare R2 vía API S3 (`@aws-sdk/client-s3`). Requiere `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` y `R2_PUBLIC_BASE_URL`.

**Flujo de subida (ambos drivers, mismo contrato):**

1. `POST /admin/subidas/firmar` `{ "nombreArchivo": "peli.mp4", "contentType": "video/mp4" }`
   → `{ "clave", "url", "metodo": "PUT", ... }`.
2. El cliente hace `PUT <url>` con el archivo como cuerpo:
   - `r2` → URL **prefirmada** directa a R2 (no pasa por la API).
   - `local` → la `url` apunta a `PUT /admin/subidas/directa` (streaming a disco).
3. Se usa la `clave` devuelta como `claveOrigen` al encolar la transcodificación (Fase 5).

> **R2 en prod:** habilita el acceso público del bucket (subdominio `r2.dev` o dominio
> propio) para servir el HLS, y configura **CORS** en el bucket si subes desde el navegador
> con la URL prefirmada.

## Frontend & continuar viendo (Fases 7–8)

**Frontend** (`apps/web`, Next.js App Router, estética VHS/videoclub):

- `/` — catálogo con **SSR** (héroe + rejilla + fila "continuar viendo" + filas por género).
- `/buscar` — búsqueda SSR con filtros de tipo, género y orden, y paginación. Todo el
  estado va en la URL, así que un resultado es enlazable.
- `/titulo/[slug]` — ficha SSR (sinopsis, géneros, episodios si es serie).
- `/ver/[slug]` (y `?episodio=<id>`) — **reproductor HLS.js**: reanudación, latidos de
  progreso, selector de calidad, encadenado con el episodio siguiente y atajos de
  teclado (espacio, ←/→, F, M).
- `/entrar` — login/registro + selección de perfil.
- `/perfiles` — gestión de perfiles de la cuenta (crear, borrar, cambiar).
- `error.tsx` / `not-found.tsx` / `loading.tsx` para los estados de fallo y carga.

**Sesión.** Los tokens viven en `localStorage`. La capa de sesión (`lib/sesion.ts`)
refresca el access token automáticamente ante un 401 y reintenta la petición; el
refresco es de un solo vuelo (compartido), porque la API **rota** el refresh token en
cada uso y dos rotaciones en paralelo se leerían como reuso y tumbarían la sesión.
Al refrescar con un perfil activo se vuelve a emitir el token **con perfil**, que es el
que exigen los endpoints de progreso.

> Nota: `localStorage` deja los tokens expuestos a XSS. Es la opción simple para un
> proyecto de práctica; en producción irían en cookies `httpOnly`.

Config del front (`apps/web/.env.local`, opcional):

```bash
API_URL=http://localhost:3000/api/v1          # SSR (server → API)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1  # navegador → API (y origen del HLS local)
```

**Continuar viendo** (Fase 8, API `/api/v1/continuar-viendo`, requiere token con perfil):

- `PUT /continuar-viendo` — latido `{ contenidoId, episodioId?, segundoActual, duracionTotal }`.
  Escribe el estado **caliente en Redis** siempre; persiste en **Postgres** de forma
  diferida (throttle ~15 s, o al completar). Marca `completado` al ~90 %.
- `GET /continuar-viendo` — títulos empezados y no completados, posición fresca de Redis.
- `GET /continuar-viendo/posicion?contenidoId=&episodioId=` — punto de reanudación de
  **un** título. A diferencia del listado, incluye los completados: al revisar algo ya
  terminado el reproductor necesita saberlo para ofrecer empezar de nuevo.
- `GET /continuar-viendo/historial` · `DELETE /continuar-viendo/:contenidoId`.

### Flujo de extremo a extremo

```
registro/login (/entrar) → elegir perfil → catálogo (/) → ficha → ▶ ver
   → el reproductor reanuda desde tu posición y guarda el progreso
   → "continuar viendo" aparece en la home
```

## Despliegue

Las dos apps van en imágenes propias, con Postgres y Redis al lado. El contexto de
build es siempre la **raíz del repo** (npm workspaces necesita el `package-lock.json`
de arriba), de ahí el `-f apps/*/Dockerfile .`.

```bash
cp .env.produccion.example .env.produccion    # rellénalo (secretos incluidos)
docker compose -f docker-compose.prod.yml --env-file .env.produccion up -d --build
```

Postgres y Redis **no publican puertos**: solo se llega a ellos por la red interna.
Delante hace falta un proxy con TLS (Caddy, Traefik, nginx) que enrute tu dominio a
`web:3001` y el de la API a `api:3000`.

> Los subcomandos posteriores (`ps`, `logs`, `down`) necesitan el mismo `--env-file`,
> o compose avisará de variables sin definir.

### Lo que hay que saber antes de desplegar

**`NEXT_PUBLIC_API_URL` se incrusta al compilar, no al arrancar.** Es la única
variable con esa trampa: Next la mete en el bundle del navegador durante el build, así
que va como `--build-arg` y cambiarla obliga a reconstruir la imagen del front
(`up -d --build`). Si solo la pasas en runtime, el navegador seguirá llamando a la URL
que hubiera al compilar. `API_URL` (el SSR) sí es de runtime, y apunta a la red interna
(`http://api:3000/api/v1`) para no salir a internet ni depender del DNS público.

**`CORS_ORIGINS` es obligatoria en producción** y la API **no arranca** sin ella: como
responde con credenciales, un comodín dejaría que cualquier web hiciera peticiones
autenticadas en nombre del usuario. Es el dominio del *front*, no el de la API.

**Las migraciones se aplican solas al arrancar** (`docker-entrypoint.sh`), y son
idempotentes. Con **más de una réplica** pon `EJECUTAR_MIGRACIONES=false` y lanza
`npm run migration:run:prod` como paso previo del despliegue, para que varias
instancias no compitan por aplicar el mismo cambio de esquema.

**Almacenamiento.** Con `STORAGE_DRIVER=local` el HLS vive en el volumen `media_data`
y el servicio deja de ser desechable (ni escala a varias réplicas). Para cualquier cosa
seria, `r2`.

**`init: true`** monta tini como PID 1 para que el `SIGTERM` llegue a Node y se ejecuten
los *shutdown hooks* de Nest (cierre del pool de Postgres, Redis y las colas).

### Servicios gestionados (Postgres y almacenamiento de terceros)

El compose lo levanta todo en una máquina, pero cada pieza se puede sustituir por
un servicio externo sin tocar código:

- **Postgres gestionado** (Supabase, Neon…): `DATABASE_SSL=true`. Solo aceptan
  conexiones TLS y sin esa variable la conexión no llega ni a abrirse — falla
  igual el arranque de la API que el `migration:run` del entrypoint.
- **Almacenamiento S3 que no sea R2** (Supabase Storage, Backblaze B2, MinIO):
  `S3_ENDPOINT` con la URL del proveedor. El driver `r2` habla S3 estándar; sin
  esa variable deriva el endpoint de `R2_ACCOUNT_ID` y se comporta como siempre,
  así que Cloudflare R2 sigue funcionando sin cambiar nada.

> Para vídeo, R2 sigue siendo la mejor opción por su egress gratuito. El endpoint
> configurable existe para cuando R2 no es viable (por ejemplo, si no quieres
> registrar una tarjeta), no porque haya dejado de ser lo recomendable.

### Desplegar el front fuera de Docker

`output: 'standalone'` solo se activa con `BUILD_DOCKER=1`, que pone el Dockerfile.
Netlify y Vercel construyen Next con su propio adaptador y esa salida les estorba,
así que en esas plataformas no hay que hacer nada: basta con definir `API_URL` y
`NEXT_PUBLIC_API_URL` en su panel de variables.

### Imágenes

| Imagen | Tamaño | Notas |
| ------ | ------ | ----- |
| `api`  | ~806 MB | Debian y no Alpine: los binarios de `ffmpeg-static`/`ffprobe-static` están enlazados contra glibc y en musl no arrancan. Se podan los binarios de macOS y Windows que trae `ffprobe-static` (~237 MB de peso muerto en Linux). |
| `web`  | ~434 MB | Salida `standalone` de Next, con `outputFileTracingRoot` apuntando a la raíz del monorepo para que el trazado incluya el `node_modules` izado. |
