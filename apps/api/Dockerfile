# syntax=docker/dockerfile:1
#
# Imagen de la API (NestJS). El contexto de build es la RAÍZ del monorepo, no
# apps/api: npm workspaces necesita el package-lock.json de arriba para instalar
# de forma reproducible.
#
#   docker build -f apps/api/Dockerfile -t netflix-clone-api .
#
# Base Debian y no Alpine a propósito: `ffmpeg-static` y `ffprobe-static` bajan
# binarios enlazados contra glibc, y en Alpine (musl) no arrancan.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# ---------------------------------------------------------------------------
# deps: dependencias completas (incl. dev) para poder compilar TypeScript
# ---------------------------------------------------------------------------
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace @netflix-clone/api --include-workspace-root

# ---------------------------------------------------------------------------
# build: compila a dist/
# ---------------------------------------------------------------------------
FROM deps AS build
COPY apps/api apps/api
RUN npm run build --workspace @netflix-clone/api

# ---------------------------------------------------------------------------
# proddeps: solo dependencias de producción, en una capa limpia.
# Aquí es donde ffmpeg-static/ffprobe-static descargan sus binarios de Linux.
# ---------------------------------------------------------------------------
FROM base AS proddeps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --omit=dev --workspace @netflix-clone/api --include-workspace-root \
    && npm cache clean --force \
    # ffprobe-static empaqueta los binarios de las tres plataformas: en una
    # imagen Linux, macOS y Windows son ~237 MB de peso muerto. `ffprobeStatic.path`
    # se resuelve por process.platform, así que borrar los otros no le afecta.
    && rm -rf node_modules/ffprobe-static/bin/darwin \
              node_modules/ffprobe-static/bin/win32

# ---------------------------------------------------------------------------
# runtime
# ---------------------------------------------------------------------------
FROM base AS runtime

# `--init` monta tini como PID 1 para que el SIGTERM del orquestador llegue a
# Node y se ejecuten los shutdown hooks de Nest (cierre del pool, Redis, colas).
# Se declara aquí como recordatorio; el flag lo pone quien corre el contenedor.

COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=proddeps /app/package.json ./package.json
COPY --from=proddeps /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --chmod=755 apps/api/docker-entrypoint.sh /usr/local/bin/entrypoint.sh

# El código resuelve MEDIA_* con `resolve()` sobre el CWD, así que el WORKDIR
# tiene que ser el del workspace para que `storage/hls` caiga donde toca.
WORKDIR /app/apps/api
RUN mkdir -p storage/source storage/hls storage/tmp \
    && chown -R node:node /app/apps/api/storage

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["entrypoint.sh"]
CMD ["node", "dist/main.js"]
