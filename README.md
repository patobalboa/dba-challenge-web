# DBA Challenge — Juego web de Gestión de Usuarios

Laboratorio interactivo para **Administración de Bases de Datos, semana 7**. Los estudiantes realizan cambios reales en PostgreSQL desde `psql` y una web Node.js comprueba cada misión, muestra pruebas individuales y acumula XP.

## Requisitos

- Ubuntu con PostgreSQL instalado y operativo (usuario administrativo local `postgres`).
- Node.js 20+ y npm.
- Acceso `sudo` en una **instancia AWS de laboratorio aislada por equipo**.
- La aplicación web escucha solo en `127.0.0.1` (no abrir el puerto 3000 en el Security Group).

## Instalación

```bash
sudo systemctl start postgresql
bash scripts/instalar.sh
npm start
```

Desde el PC personal, crea un túnel SSH (ajusta usuario e IP):

```bash
ssh -L 3000:127.0.0.1:3000 ubuntu@IP_PUBLICA
```

Luego abre **http://localhost:3000** en el navegador del PC. Si el puerto 3000 local está ocupado, usa `ssh -L 3001:127.0.0.1:3000 ...` y abre `http://localhost:3001`.

## Cómo jugar

En otra sesión SSH:

```bash
sudo -u postgres psql -d db_challenge
```

Lee las misiones en la web, ejecuta tus SQL en PostgreSQL, pulsa **Verificar todas las misiones** y observa cuáles pruebas pasan. Las pruebas usan `SET LOCAL ROLE` y transacciones que terminan en `ROLLBACK`: los INSERT/UPDATE/DELETE del verificador no persisten.

La web no recibe ni ejecuta SQL libre, ni expone contraseñas de la base.

## Perfiles predefinidos

- `dc_analista`: consultar clientes y ventas mediante un rol agrupador `dc_lectura` que deben crear.
- `dc_aplicacion`: consultar productos y registrar ventas.
- `dc_auditor`: consultar las cuatro tablas, sin escribir.
- `dc_exdev`: cuenta insegura de exdesarrollador, incidente de la misión 5.

La base `db_challenge` incluye `clientes`, `productos`, `ventas`, `empleados` y registros ficticios. El instalador **se niega a sobrescribir** una base o roles existentes.

## Precauciones importantes

1. **Solo laboratorio:** las contraseñas iniciales son conocidas y el escenario `dc_exdev` es deliberadamente inseguro.
2. Los roles de PostgreSQL son **globales a la instancia**, no exclusivos de la base `db_challenge`. No instalar en un servidor compartido o productivo.
3. La app dispone de un usuario `dc_verificador` con capacidad de asumir los cuatro roles de ejercicio para comprobar privilegios. Su contraseña aleatoria se guarda en `.env` (modo 600); no publiques este archivo.
4. El verificador evalúa permisos **efectivos mediante `SET ROLE`**. Esto no reemplaza una prueba de autenticación real con contraseñas y `pg_hba.conf`; el docente puede pedirla por separado.
5. Para simular el bloqueo de un exfuncionario, `NOLOGIN` impide nuevas conexiones, pero no termina sesiones ya existentes. Verificar `pg_stat_activity` en el ejercicio.
6. No uses `sudo npm start`: inicia la web como usuario normal.
7. Si los estudiantes acceden desde Internet, usa el túnel SSH indicado; no publiques la web ni PostgreSQL.

## Solución de problemas

- Si no conecta a PostgreSQL: `sudo systemctl status postgresql`, verifica `.env`, comprueba `pg_hba.conf` para conexiones locales TCP por contraseña.
- Si una prueba de escritura falla: revisa los permisos de la secuencia `ventas_id_seq`, del esquema `public` y de las tablas referenciadas.
- Si las pruebas de acceso denegado no pasan: verifica que los roles no sean miembros de roles con permisos más amplios y que no existan privilegios `PUBLIC` inesperados.

## Estructura

```text
server.js             Verificador de permisos (API solo lectura para navegador)
public/               Interfaz web con tablero de misiones
scripts/instalar.sh   Prepara PostgreSQL y .env
scripts/01_datos.sql  Tablas y datos ficticios
scripts/02_inseguro.sql  Cuenta del incidente
.env.example          Configuración de referencia
```
