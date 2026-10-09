#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(id -u)" -eq 0 ]]; then
  echo 'Ejecuta con tu usuario normal (con sudo), no con sudo bash.' >&2
  exit 1
fi
command -v psql >/dev/null || { echo 'Falta psql: sudo apt install postgresql-client'; exit 1; }
command -v node >/dev/null || { echo 'Falta Node.js'; exit 1; }
command -v npm >/dev/null || { echo 'Falta npm'; exit 1; }
sudo -u postgres psql -X -Atqc "SELECT 1 FROM pg_database WHERE datname='db_challenge'" | grep -qx 1 && { echo 'Ya existe db_challenge. Instalación cancelada sin modificarla.'; exit 1; }
for role in dc_analista dc_aplicacion dc_auditor dc_exdev dc_verificador; do
  if sudo -u postgres psql -X -Atqc "SELECT 1 FROM pg_roles WHERE rolname='$role'" | grep -qx 1; then
    echo "Ya existe el rol $role. Instalación cancelada."; exit 1
  fi
done
SECRET="$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))")"
# Los usuarios del ejercicio son deliberadamente identificables y solo válidos para laboratorio.
sudo -u postgres psql -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE dc_analista LOGIN PASSWORD 'LabAnalista2026!';
CREATE ROLE dc_aplicacion LOGIN PASSWORD 'LabAplicacion2026!';
CREATE ROLE dc_auditor LOGIN PASSWORD 'LabAuditor2026!';
CREATE ROLE dc_exdev LOGIN PASSWORD 'LabExdev2026!';
CREATE ROLE dc_verificador LOGIN NOINHERIT;
GRANT dc_analista, dc_aplicacion, dc_auditor, dc_exdev TO dc_verificador;
CREATE DATABASE db_challenge;
SQL
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d db_challenge -f scripts/01_datos.sql
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -d db_challenge -f scripts/02_inseguro.sql
# Establecer secreto aleatorio usando sustitución de psql con escape SQL seguro.
sudo -u postgres psql -X -v ON_ERROR_STOP=1 -c "ALTER ROLE dc_verificador PASSWORD '$SECRET';"
cat > .env <<ENV
PORT=3000
HOST=127.0.0.1
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=db_challenge
PGUSER=dc_verificador
PGPASSWORD=$SECRET
ENV
chmod 600 .env
npm install --no-audit --no-fund
printf '\nInstalado. Ejecuta: npm start\nAbre desde tu computador con túnel SSH: ssh -L 3000:127.0.0.1:3000 ubuntu@IP_PUBLICA\nLuego visita http://localhost:3000\n'
