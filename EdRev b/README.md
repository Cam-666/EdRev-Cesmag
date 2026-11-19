# EdRev Cesmag · Backend

API de EdRev Cesmag en **Node 24 + TypeScript + Express 5 + PostgreSQL**. Responde con el mismo contrato que la
API simulada (MSW) del frontend: basta con apagar los mocks para que el frontend la use.

La base de datos es la del **Modelo de datos** (anexo A, probado en PostgreSQL 18): 13 tablas y 3 vistas. Extensiones
sobre la v3.8, que recoge `Cambios_para_Modelo_de_datos_v3.9.md`: `par_evaluador.profesion`, la base de pares común a las
dos revistas, las plantillas por uso con sus imágenes, `revista.issn` e `indexaciones`, y las tablas `configuracion` y
`por_corregir`.

## Puesta en marcha (local, con pgAdmin)

1. **Contraseña de PostgreSQL y secreto de la sesión.** Copie `.env.example` a `.env`. Reemplace `CLAVE` (en
   `DATABASE_URL` y `DATABASE_ADMIN_URL`) por la contraseña del usuario `postgres` y ponga en `JWT_SECRET` una cadena
   aleatoria de 32 caracteres o más (el servidor no arranca con una más corta ni con el texto de ejemplo). Genere una con:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. **Crear la base y sus tablas** (desde la carpeta `EdRev b`):

   ```bash
   npm install
   npm run db:crear   # crea la base «edrev» (o: pgAdmin › Databases › Create › Database › edrev)
   npm run db:init    # ejecuta db/01_esquema.sql y db/02_datos_iniciales.sql
   ```

   Alternativa sin consola: en pgAdmin cree la base `edrev`, abra **Query Tool** sobre ella y ejecute
   `db/01_esquema.sql` y luego `db/02_datos_iniciales.sql`.
   Una base que ya tenía datos de una versión anterior se actualiza ejecutando **una vez** `db/03_fin_de_plantilla.sql`
   (agrega `plantilla.fin`, para qué sirve cada plantilla, y quita las columnas de firma en texto de `revista`):

   ```bash
   node --env-file=.env -e "const {Pool}=require('pg');new Pool({connectionString:process.env.DATABASE_URL}).query(require('fs').readFileSync('db/03_fin_de_plantilla.sql','utf8')).then(()=>{console.log('listo');process.exit(0)})"
   ```

3. **Arrancar la API:** `npm run dev` → `http://localhost:3000/api` (prueba: `http://localhost:3000/api/salud`).
4. **Conectar el frontend:** cree `EdRev f/.env.local` con

   ```
   VITE_USE_MOCKS=false
   VITE_API_URL=http://localhost:3000/api
   ```

   y reinicie `npm run dev` del frontend. Para volver a los datos simulados, borre ese archivo.

Cuentas iniciales (contraseña `Editorial2026*`, cámbiela antes de la puesta en marcha):
`maria.mendoza@unicesmag.edu.co` (Administradora) y `andrea.villota@unicesmag.edu.co` (Auxiliar).

## Qué cubre esta primera versión

| Módulo | Estado |
| --- | --- |
| Acceso: ingreso, intentos y bloqueo de 15 min, sesión con JWT | Listo |
| Artículos: listado y filtros, ficha, registro con autores, edición, rondas del comité, cambio de revista, cierre y reapertura, historial | Listo |
| Autores: directorio común, ficha y artículos, registro y edición | Listo |
| Pares: base común a las dos revistas, filtros, ficha, registro (avisa si ya existe), bloqueo y desbloqueo | Listo |
| Asignación: par disponible o candidato nuevo, dos pares y un tercero de desempate, respuesta, entrega con concepto y fecha, resultado del artículo según los conceptos | Listo |
| Tablero e Inicio | Listo |
| Constancias: pendientes y emitidas, vista previa con la plantilla en uso, emitir una o todas, reenviar | Listo |
| Correos enviados: registro con tipos derivados (2.º intento, reenvío por corrección), contadores, reintentar, corregir y reenviar | Listo |
| Administración: usuarios (con enlace para definir la contraseña), plantillas por uso con vista previa del correo y del PDF, configuración, auditoría | Listo |
| Enlaces de contraseña (cuenta nueva y recuperación): 30 minutos, un solo uso | Listo |
| Informe de gestión por revista y semestre, como datos, CSV y documento PDF con gráficas | Listo |
| Envío de correos en segundo plano (Brevo o simulado) con la constancia en PDF adjunta | Listo |
| Segundo intento automático y bloqueo «Sin respuesta» tras los días de espera (RF-29) | Listo |
| Descarga de la constancia en PDF (`/:revista/constancias/:id/pdf`) | Listo |
| Rebotes reales: webhook de Brevo `/api/webhooks/brevo?token=BREVO_WEBHOOK_TOKEN` | Listo |
| Seguridad: cabeceras (helmet), límite de peticiones, JWT HS256 con secreto fuerte | Listo |
| Registros migrados por corregir | Listo (queda vacío hasta que se haga la migración del Excel) |

## Correos

`CORREO_MODO` en `.env`:

- `simulado` (para demostrar): los correos se marcan «Enviado» a los pocos segundos y se escriben en la consola.
- `brevo`: envío real. Ponga la clave en `BREVO_API_KEY` y verifique en Brevo los remitentes de cada revista
  (`revista.correo_remitente`). La constancia va adjunta en PDF, con el encabezado, el pie y la firma de su plantilla.
- `apagado`: quedan «En cola».

Mientras no haya correo real, `ENLACE_DEMO=true` hace que la API devuelva el enlace de contraseña para abrirlo en
la demostración (botón «Demostración: abrir el enlace»). En producción ponga `ENLACE_DEMO=false`.

Todos los correos llevan el marco institucional de la Universidad CESMAG (encabezado con el escudo, franja con la
dependencia, contacto y avisos legales; ver `src/lib/marcoCorreo.ts`). El escudo sale de `LOGO_CORREO_URL` (por defecto,
el que la universidad publica en su sitio). La firma es una imagen que se sube en la plantilla (de invitación, de agradecimiento o de cualquier plantilla de correo) y
cierra el correo, debajo del aviso de datos personales. Solo se muestra en los correos reales cuando `API_PUBLICA_URL`
es una dirección `https` alcanzable desde Internet; la vista previa de la plantilla siempre la muestra. La constancia
sale adjunta en PDF, que el cliente de correo muestra debajo del mensaje.

## Arquitectura

```
src/
  app.ts            el orden dice qué es público y qué privado
  middlewares/      autenticacion (JWT: firma, expiración, usuario activo) y errores
  rutas/publicas/   acceso, invitaciones (respuesta del par desde el correo), imágenes y webhooks
  rutas/privadas/   todo lo demás, detrás de la sesión; solo declaran dirección y permiso
  controladores/    validan la petición (zod) y responden
  servicios/        reglas de negocio y SQL, sin req ni res
  lib/              utilidades (errores HTTP, fechas, formato, auditoría)
```

Una ruta nueva sigue el mismo camino: ruta → controlador → servicio. Las pruebas (`pruebas/`) llaman a la API completa.

## Demostrar el segundo intento

Los días de espera (5 al inicio) se cambian en **Administración › Configuración**. Para demostrarlo con `CORREO_MODO=simulado`, la Administradora puede enviar a la API `PUT /api/configuracion` con `{"diasEspera": 0.0002}` (unos 17 segundos; la pantalla solo admite días enteros): una invitación sin respuesta pasa a «2.º intento» en menos de un minuto y al minuto siguiente el par queda bloqueado «Sin respuesta». Vuelva a `5` después. `DIAS_ESPERA_RESPUESTA` solo se usa mientras no haya un valor guardado.

## Pruebas automáticas

```
npm test
```

Corren contra una base aparte, `edrev_prueba`, que se borra y se vuelve a crear en cada corrida (necesita `DATABASE_ADMIN_URL` en `.env`). La base `edrev` no se toca. Cubren el acceso y la validación del JWT, las rutas públicas y privadas, los artículos y el comité, la asignación de pares y el resultado según sus conceptos, las constancias, los correos y su marco institucional, las plantillas, la auditoría y los informes en PDF.

## Migración del Excel (RF-42 a RF-44)

```
npm run migrar -- reep db/plantilla_migracion.csv --simular   (prueba: no guarda nada)
npm run migrar -- reep ruta/al/archivo.xlsx                     (carga real)
```

Lee la primera hoja de un `.xlsx` o `.csv`; la primera fila son los encabezados. Una fila por artículo y par (un artículo con tres pares ocupa tres filas con el mismo N.º OJS). Encabezados: N.º OJS, Título, Tipo de artículo, Fecha de postulación, Estado, Autores (separados por `;`), Par, Correo par, Universidad par, Concepto, Fecha de entrega, Constancia (Sí/X marca la constancia ya emitida). Ver `db/plantilla_migracion.csv`.

- Lo que no coincide con las listas del sistema (tipo, estado, concepto, correo) se carga vacío y aparece en **Por corregir**.
- Si un mismo archivo trae las dos revistas, agregue una columna **Revista** (REEP / IRE, o el nombre de la revista) y use `npm run migrar -- todas archivo.xlsx`: cada fila va a su revista y las que no la indican se informan aparte.
- Los artículos cuyo N.º OJS ya existe en la revista se omiten, así que se puede repetir la carga.
- Si los encabezados del Excel real son distintos, se agregan sus nombres en `ALIAS` de `src/servicios/migracion.ts`.

## Respaldo de la base (RNF-08)

```
npm run respaldo
```

Crea `respaldos/edrev-AAAAMMDD-HHMM.sql` con `pg_dump` y conserva los últimos 14. Si `pg_dump` no está en el PATH, ponga su ruta en `PG_DUMP_RUTA` (en Windows: `C:\Program Files\PostgreSQL8in\pg_dump.exe`). Para restaurar: `psql -d edrev -f respaldos/<archivo>.sql`. Para programarlo cada día, use el Programador de tareas de Windows (acción: `npm run respaldo` en la carpeta `EdRev b`) o `cron` en Linux. Copie la carpeta `respaldos/` fuera del servidor: contiene datos personales.

## Variables de entorno

Ver `.env.example`. Ninguna credencial va en el código (RNF-07); los valores de la sección 3.2 (umbral, días de
espera, intentos, máximo de pares) también son variables, para el traslado al servidor de la universidad (RNF-13).

## Docker

En la raíz del repositorio está `docker-compose.yml` con la base, la API y el frontend:

```bash
docker compose up --build
```

Frontend en `http://localhost:8080`, API en `http://localhost:3000/api`, PostgreSQL en el puerto `5433` (para no
chocar con el local). La primera vez la base se crea sola con `db/01_esquema.sql` y `db/02_datos_iniciales.sql`.
Claves por variables: `DB_PASSWORD`, `JWT_SECRET` (**obligatoria**: cadena aleatoria de 32 caracteres o más; sin ella
el compose no arranca), `CORREO_MODO`, `BREVO_API_KEY`, `ENLACE_DEMO`, `FRONTEND_URL`, `API_PUBLICA_URL` y
`ZONA_HORARIA` (en un `.env` junto al compose). Requiere Docker Desktop instalado.
