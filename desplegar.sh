#!/usr/bin/env bash
# Despliega EdRev Cesmag con Docker en un servidor Ubuntu: instala Docker si falta, crea el .env con claves
# aleatorias, construye y arranca los tres contenedores y comprueba que respondan.
#
#   ./desplegar.sh                          → el sistema queda en http://localhost:8080
#   ./desplegar.sh http://192.168.1.50:8080 → con la dirección con que se abrirá la página (sin «/» al final)
#
# Es seguro repetirlo: no reemplaza un .env que ya exista.
set -euo pipefail
cd "$(dirname "$0")"

URL="${1:-http://localhost:8080}"
URL="${URL%/}"

echo "==> 1/5 Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "    Docker no está instalado: se instala ahora (pide la contraseña de sudo)."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
fi
# Si el grupo «docker» aún no está activo en esta sesión, se usa sudo solo para esta ejecución.
if docker info >/dev/null 2>&1; then D="docker"; else D="sudo docker"; fi
$D compose version >/dev/null 2>&1 || { echo "ERROR: falta el plugin «docker compose». Ejecute: sudo apt install -y docker-compose-v2"; exit 1; }

echo "==> 2/5 Archivo .env"
if [ -f .env ]; then
  echo "    Ya existe un .env: se conserva tal como está."
else
  cp .env.example .env
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$(openssl rand -hex 12)|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" .env
  sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${URL}|" .env
  sed -i "s|^API_PUBLICA_URL=.*|API_PUBLICA_URL=${URL}|" .env
  echo "    Creado con claves aleatorias. Dirección del sistema: ${URL}"
fi

echo "==> 3/5 Construir y arrancar (la primera vez tarda entre 4 y 10 minutos)"
$D compose up -d --build

echo "==> 4/5 Esperando a que el sistema responda"
OK=0
for i in $(seq 1 60); do
  if curl -fsS http://localhost:8080/api/salud >/dev/null 2>&1; then OK=1; break; fi
  sleep 3
done

echo "==> 5/5 Estado"
$D compose ps
if [ "$OK" = "1" ]; then
  echo
  echo "LISTO. La API responde: $(curl -fsS http://localhost:8080/api/salud)"
  echo "Abra ${URL} en el navegador."
  echo "Cuentas iniciales: EdRev b/db/02_datos_iniciales.sql"
else
  echo
  echo "ATENCIÓN: el sistema no respondió a tiempo. Revise el registro con:"
  echo "    $D compose logs --tail=60 api"
  exit 1
fi
