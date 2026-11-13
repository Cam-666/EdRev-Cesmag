# EdRev Cesmag · Backend

API de EdRev Cesmag en **Node 24 + TypeScript + Express 5 + PostgreSQL**. Responde con el mismo contrato que la
API simulada (MSW) del frontend: basta con apagar los mocks para que el frontend la use.

La base de datos es la del **Modelo de datos v3.8** (anexo A, probado en PostgreSQL 16): 11 tablas, 2 disparadores,
3 vistas. Única extensión: `par_evaluador.profesion` (la invitación nombra al par «con su profesión», RF-25).

## Puesta en marcha (local, con pgAdmin)

1. **Contraseña de PostgreSQL.** Abra `EdRev b/.env` y reemplace `CLAVE` (en `DATABASE_URL` y `DATABASE_ADMIN_URL`)
   por la contraseña del usuario `postgres` que definió al instalar PostgreSQL.
2. **Crear la base y sus tablas** (desde la carpeta `EdRev b`):

   ```bash
   npm install
   npm run db:crear   # crea la base «edrev» (o: pgAdmin › Databases › Create › Database › edrev)
   npm run db:init    # ejecuta db/01_esquema.sql y db/02_datos_iniciales.sql
   ```

   Alternativa sin consola: en pgAdmin cree la base `edrev`, abra **Query Tool** sobre ella y ejecute
   `db/01_esquema.sql` y luego `db/02_datos_iniciales.sql`.
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
| Pares: base por revista, filtros, ficha, registro, correo en la otra revista, bloqueo y desbloqueo | Listo |
| Asignación: par disponible o candidato nuevo, máximo tres aceptados, desempate, respuesta, entrega, concepto | Listo |
| Tablero e Inicio | Listo |
| Constancias: pendientes y emitidas, vista previa con la plantilla en uso, emitir una o todas, reenviar | Listo |
| Correos enviados: registro con tipos derivados (2.º intento, reenvío por corrección), contadores, reintentar, corregir y reenviar | Listo |
| Envío real de correos (Brevo) y PDF de la constancia, plantillas, usuarios, auditoría, informes, enlaces de contraseña, registros migrados | Pendiente |

Las invitaciones quedan registradas **«En cola»**: saldrán cuando se conecte el servicio de correo.

## Variables de entorno

Ver `.env.example`. Ninguna credencial va en el código (RNF-07); los valores de la sección 3.2 (umbral, días de
espera, intentos, máximo de pares) también son variables, para el traslado al servidor de la universidad (RNF-13).

## Docker (siguiente paso)

El proyecto ya está preparado: todo se configura por variables de entorno, `npm run build` deja `dist/` y
`npm start` lo ejecuta. Falta agregar el `Dockerfile` y un `docker-compose.yml` con PostgreSQL que monte
`db/` en `/docker-entrypoint-initdb.d/` para crear la base al primer arranque.
