# syntax=docker/dockerfile:1
#
# Imagen del front (Next.js, salida standalone). Contexto de build = raíz del
# monorepo:
#
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.tudominio.com/api/v1 \
#     -t netflix-clone-web .
#
# OJO con NEXT_PUBLIC_API_URL: Next la INCRUSTA en el bundle del navegador
# durante el build, no la lee al arrancar. Por eso es un build-arg y no una
# variable de entorno del contenedor: si la pasas solo en runtime, el navegador
# seguirá llamando a la URL que hubiera al compilar (por defecto localhost).
# API_URL, en cambio, la usa el servidor de Next en cada petición y sí va en
# runtime — de hecho conviene que apunte a la red interna.

FROM node:22-bookworm-slim AS base
WORKDIR /app

# ---------------------------------------------------------------------------
# deps
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @netflix-clone/web --include-workspace-root

# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------
FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/web apps/web
RUN npm run build --workspace @netflix-clone/web

# ---------------------------------------------------------------------------
# runtime
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# La salida standalone replica la estructura del monorepo: el servidor queda en
# apps/web/server.js y los node_modules trazados cuelgan de la raíz.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
