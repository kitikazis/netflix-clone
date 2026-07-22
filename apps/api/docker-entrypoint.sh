#!/bin/sh
# Arranque de la API en contenedor.
#
# Las migraciones se aplican antes de servir. Es lo correcto para un despliegue
# de una sola instancia; si escalas a varias réplicas, pon EJECUTAR_MIGRACIONES=false
# y lanza `npm run migration:run:prod` como paso previo del despliegue, para que
# no compitan varias instancias por aplicar el mismo cambio de esquema a la vez.
set -e

if [ "${EJECUTAR_MIGRACIONES:-true}" = "true" ]; then
  echo "[entrypoint] Aplicando migraciones…"
  npm run --silent migration:run:prod
  echo "[entrypoint] Migraciones al día."
fi

exec "$@"
