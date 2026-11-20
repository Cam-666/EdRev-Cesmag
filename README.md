# EdRev Cesmag

Sistema de gestión editorial de la Universidad CESMAG para sus dos revistas: **Revista Electrónica en Educación y
Pedagogía (REEP)** y **Revista Investigium IRE Ciencias Sociales y Humanas (IRE)**. Reemplaza el Excel con el que la
dependencia de Editorial hace seguimiento a los artículos y automatiza dos tareas: la invitación a los pares
evaluadores y la emisión de las constancias de evaluación.

El proceso de cada artículo es: postulación → revisión inicial del comité editorial → evaluación por pares →
constancia. Las dos revistas siguen el mismo proceso pero cada una tiene sus artículos, sus plantillas de correo y su
constancia. Los autores y los pares forman directorios comunes a las dos revistas.

Quienes usan el sistema son la **Administradora** (hace todo, incluida la administración del sistema) y la **Auxiliar**
(todo el trabajo editorial, menos Administración). Los pares evaluadores y los autores no entran al sistema: reciben
correos, y el par responde a la invitación desde los botones del propio correo.

## Contenido del repositorio

| Carpeta | Qué es |
| --- | --- |
| `EdRev f/` | Interfaz web (React 19, TypeScript, Vite, Tailwind, Radix, TanStack Query). Puede funcionar sola con datos de ejemplo. |
| `EdRev b/` | API (Node 24, Express 5, TypeScript, PostgreSQL). Su propio README detalla la puesta en marcha y la arquitectura. |
| `docker-compose.yml` | Base de datos, API e interfaz juntas, para desplegar con un solo comando. |

La documentación funcional (requisitos, historias de usuario, modelo de datos y diagramas) no está en el repositorio:
la guarda la dependencia de Editorial. El esquema real de la base de datos está en `EdRev b/db/01_esquema.sql`.

## Puesta en marcha en un computador local

Requisitos: **Node 24** y **PostgreSQL 14 o superior** (probado en 18).

1. Instale las dependencias: `npm run install:backend` y `npm run install:frontend` (desde esta carpeta).
2. Configure el servidor: copie `EdRev b/.env.example` como `EdRev b/.env`, escriba la contraseña de PostgreSQL y un
   `JWT_SECRET` aleatorio de 32 caracteres o más (el servidor no arranca con uno más corto). El detalle de cada
   variable está en el propio `.env.example`.
3. Cree la base: `npm run db:crear` y `npm run db:init` (crean la base `edrev`, sus tablas y los datos iniciales:
   las dos revistas, dos cuentas —Administradora y Auxiliar— y las plantillas).
4. Arranque la API: `npm run dev:backend` (`http://localhost:3000/api`).
5. Arranque la interfaz: `npm run dev` (`http://localhost:5173`). Para que use la API real y no los datos de
   ejemplo, cree `EdRev f/.env.local` con:

   ```
   VITE_USE_MOCKS=false
   VITE_API_URL=http://localhost:3000/api
   ```

La contraseña inicial de las dos cuentas está en `EdRev b/db/02_datos_iniciales.sql`; cámbiela con «¿Olvidó su
contraseña?» antes de la puesta en marcha. Sin `VITE_USE_MOCKS=false` la interfaz trabaja con datos de ejemplo en el
navegador (útil para demostrar o diseñar sin base de datos).

## Variables de entorno principales

Todas se definen en `EdRev b/.env` (ver `EdRev b/.env.example`). Ninguna credencial va en el código.

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL. |
| `JWT_SECRET` | Firma de la sesión y de los enlaces de los correos. Mínimo 32 caracteres aleatorios. |
| `CORS_ORIGIN`, `FRONTEND_URL` | Dirección de la interfaz (permiso del navegador y enlaces que salen por correo). |
| `CORREO_MODO` | `simulado` (no sale nada, para demostrar), `brevo` (envío real) o `apagado` (los correos quedan en cola). |
| `BREVO_API_KEY` | Clave del servicio de correo Brevo (solo con `CORREO_MODO=brevo`). |
| `BREVO_WEBHOOK_TOKEN` | Token secreto con que Brevo avisa de los rebotes. |
| `REMITENTE_CUENTAS` | Correo desde el que salen los enlaces de contraseña (si no se define, el de la primera revista). |
| `LOGO_CORREO_URL` | Dirección del escudo del encabezado de los correos (por defecto, el del sitio de la universidad). |
| `ZONA_HORARIA` | Zona horaria de la dependencia (por defecto `America/Bogota`). |
| `UMBRAL_COINCIDENCIAS`, `DIAS_ESPERA_RESPUESTA`, `INTENTOS_ANTES_BLOQUEO`, `MAX_PARES_POR_ARTICULO` | Valores del proceso. Los días de espera los cambia la Administradora en Administración › Configuración y ese valor gana sobre el de `.env`. |

## Correos: configurar Brevo y los remitentes de las dos revistas

El sistema envía los correos (invitaciones, agradecimientos con la constancia en PDF y enlaces de contraseña) a través
de [Brevo](https://www.brevo.com). Mientras `CORREO_MODO=simulado` nada sale: los correos se marcan «Enviado» y se
escriben en la consola del servidor. Para enviar de verdad:

### 1. Cuenta y clave de Brevo

1. Cree una cuenta en Brevo (con una cuenta de la dependencia, no personal) y entre a su panel.
2. En el panel, en **SMTP & API** (SMTP y API), genere una **clave API** (API key) y cópiela. Se muestra una sola vez.
3. Póngala en `EdRev b/.env` como `BREVO_API_KEY=...` y cambie `CORREO_MODO=brevo`. Reinicie la API.

El plan gratuito de Brevo tiene un tope diario de envíos; revise el de su cuenta para saber si alcanza para la
operación normal de la dependencia.

### 2. Verificar el remitente de cada revista

Brevo solo envía desde direcciones verificadas. Cada revista sale desde su propia dirección, que está guardada en la
tabla `revista` (columna `correo_remitente`). Los datos iniciales traen estas dos:

| Revista | id | Remitente inicial |
| --- | --- | --- |
| REEP | 1 | `revistaeducacionpedagogia@gmail.com` |
| IRE | 2 | `revistainvestigiumire@gmail.com` |

Para cada una: en Brevo, **Senders, Domains & Dedicated IPs › Senders › Add a sender** (remitentes, dominios e IP
dedicadas); escriba el correo y el nombre de la revista. Brevo envía un mensaje de confirmación a esa dirección: ábralo y confirme. Mientras la
dirección no esté verificada, Brevo rechaza los envíos de esa revista.

Con direcciones de Gmail el envío funciona para probar, pero los correos pueden terminar en la carpeta de spam. Para
producción es mejor usar direcciones del dominio de la universidad (por ejemplo `@unicesmag.edu.co`) y **autenticar el
dominio** en Brevo (registros SPF y DKIM): ese cambio de DNS lo hace el área de sistemas de la universidad.

### 3. Cambiar (mudar) los correos de las revistas

Los correos de las revistas no se editan desde la página: se cambian en la base de datos. Cuando tenga las direcciones
definitivas, **primero verifíquelas en Brevo** (paso 2) y luego ejecute, en pgAdmin (Query Tool sobre la base `edrev`):

```sql
UPDATE revista SET correo_remitente = 'correo.de.reep@dominio.edu.co'  WHERE id_revista = 1;  -- REEP
UPDATE revista SET correo_remitente = 'correo.de.ire@dominio.edu.co'   WHERE id_revista = 2;  -- IRE
```

Las direcciones van en minúsculas. El cambio rige desde el siguiente correo, sin reiniciar. Esa misma dirección es la que
aparece en el bloque de contacto del correo y a la que responde el par. Si instala el sistema desde cero, edite las
dos direcciones en `EdRev b/db/02_datos_iniciales.sql` antes de ejecutarlo.

Los enlaces de contraseña (cuenta nueva y «¿Olvidó su contraseña?») salen desde `REMITENTE_CUENTAS`; si no se define,
desde el remitente de la primera revista. Verifique también esa dirección en Brevo.

### 4. Aviso de rebotes (webhook)

Para que el sistema sepa cuándo una dirección no existe o el correo no se pudo entregar, Brevo debe avisarle. En Brevo,
en la configuración de correo transaccional, cree un **webhook** con esta dirección y marque los eventos de rebote
duro, rebote blando, bloqueado, correo inválido y error:

```
https://<direccion-publica-de-la-api>/api/webhooks/brevo?token=<BREVO_WEBHOOK_TOKEN>
```

El token es el mismo que escribió en `BREVO_WEBHOOK_TOKEN`. La API debe ser alcanzable desde Internet (un servidor
desplegado, no un computador local). Sin el webhook los correos se envían igual, pero los rebotes no se reflejan.

### 5. Probar

Con la API reiniciada, asigne un par (use su propio correo como candidato) a un artículo aprobado por el comité y
revise en **Correos enviados** que la invitación quede «Enviado». Si no llega, mire la consola del servidor.

### Si algo falla

| Qué se ve | Qué significa |
| --- | --- |
| El correo queda **En cola** | `CORREO_MODO` está en `apagado` o no se ha reiniciado la API. |
| **Fallido** y en la consola `Brevo 4xx` | Brevo rechazó el envío: clave API mala, remitente sin verificar o tope diario. El mensaje de Brevo sale en la consola. Los fallidos se reintentan solos unas veces y luego con «Reintentar fallidos». |
| **Rebotado** | La dirección del par no existe. Se corrige con «Corregir y reenviar». |
| «Sin plantilla en uso» en la consola | La revista no tiene plantilla elegida para ese correo: se elige en Administración › Configuración. |
| Los correos salen sin escudo | `LOGO_CORREO_URL` no es alcanzable desde Internet. |

## Cómo funciona por dentro (para soporte)

- **Tareas de fondo:** la API lleva dos temporizadores propios (no hay un servicio aparte). Cada pocos segundos envía
  los correos en cola; cada minuto revisa las invitaciones sin respuesta: pasados los días de espera envía el segundo
  intento y, si tampoco responde, bloquea al par con el motivo «Sin respuesta». Ver `src/servicios/envioCorreos.ts` y
  `src/servicios/segundoIntento.ts`.
- **Capas de la API:** ruta → controlador (valida la petición) → servicio (reglas de negocio y SQL). Las rutas públicas
  (ingreso, respuesta del par, webhook, escudo) están separadas de las privadas, que exigen sesión.
- **Plantillas:** cada revista tiene las suyas. Una plantilla conserva el fin para el que se creó (`fin`: invitación,
  agradecimiento o constancia) y solo se elige para ese fin; la que está en uso se escoge en Configuración. Las nuevas
  nacen en blanco. El texto se guarda con marcas sencillas (`{{par}}`, `[centro]`, `**negrita**`) que el editor de la
  página oculta.
- **Constancia:** se genera de nuevo cada vez que se envía o se descarga (no se guarda el archivo), con las imágenes de
  encabezado, pie y firma de la plantilla, y viaja como PDF adjunto al correo de agradecimiento.
- **Pares:** una sola base para las dos revistas; el correo es único y un bloqueo vale para ambas. Un artículo toma dos
  pares y un tercero solo si sus conceptos no coinciden. No se asigna un par de la misma institución de un autor.
- **Comité:** el comité elige el resultado de cada ronda (la página solo sugiere uno) y no hay límite de rondas;
  solo una ronda Aprobada permite asignar pares.
- **Auditoría:** cada acción queda registrada con su usuario y fecha (Administración › Auditoría y el historial de
  cada artículo).
- **Sesión:** JWT con vencimiento de 8 horas; la interfaz la cierra tras 30 minutos de inactividad. Tres intentos
  fallidos de ingreso bloquean la cuenta 15 minutos.

## Actualizar una base de datos ya creada

Una base creada con una versión anterior se actualiza ejecutando **una vez** `EdRev b/db/03_fin_de_plantilla.sql`
(agrega `plantilla.fin`, quita las firmas en texto de las revistas, las imágenes de las plantillas de correo y
`plantilla.correo_firma`). Es seguro repetirlo. Una base nueva ya trae todo con `01_esquema.sql`. Las instrucciones
para ejecutarlo están en `EdRev b/README.md`.

## Pruebas

| Dónde | Comando | Qué prueba |
| --- | --- | --- |
| `EdRev b` | `npm test` | La API completa contra una base aparte, `edrev_prueba`, que se recrea en cada corrida (necesita `DATABASE_ADMIN_URL`). La base `edrev` no se toca. |
| `EdRev f` | `npm test` | Pantallas, reglas y accesibilidad, contra una API simulada (MSW). |

Antes de entregar un cambio: `npm run typecheck`, `npm run lint` y `npm test` en cada carpeta.

## Respaldo de la base de datos

`npm run respaldo` (en `EdRev b`) crea `respaldos/edrev-AAAAMMDD-HHMM.sql` con `pg_dump` y conserva los últimos 14.
Prográmelo cada día con el Programador de tareas de Windows o con `cron`, y copie la carpeta `respaldos/` fuera del
servidor: contiene datos personales. Los detalles (ruta de `pg_dump`, restauración) están en `EdRev b/README.md`.

## Despliegue con Docker (servidor Ubuntu)

Todo el sistema corre en tres contenedores: la base de datos (PostgreSQL 18), la API y la interfaz (nginx). Solo se
publica el puerto **8080**: nginx sirve la página y reenvía `/api` a la API, así el navegador usa una sola dirección.

1. Instale Docker en el servidor (`curl -fsSL https://get.docker.com | sudo sh`) y descargue el proyecto con `git clone`.
2. En la carpeta del proyecto, copie `.env.example` como `.env` y complételo: `DB_PASSWORD`, `JWT_SECRET`
   (`openssl rand -hex 32`) y `FRONTEND_URL` / `API_PUBLICA_URL` con la dirección con que se abrirá la página
   (por ejemplo `http://192.168.1.50:8080`, sin `/` al final).
3. Arranque: `docker compose up -d --build`. La primera vez la base se crea sola con `EdRev b/db/01_esquema.sql` y
   `02_datos_iniciales.sql`.
4. Abra `http://<dirección-del-servidor>:8080`.

Comandos útiles: `docker compose ps` (estado), `docker compose logs -f api` (registro de la API),
`docker compose restart api` (reiniciar), `docker compose down` (apagar; los datos se conservan en el volumen `datos`)
y `docker compose down -v` (apagar **y borrar** la base). Para cambiar una variable del `.env`, edítelo y ejecute
`docker compose up -d`. En producción ponga `ENLACE_DEMO=false` y `CORREO_MODO=brevo` (ver la sección de Brevo).
Respaldo de la base: `docker compose exec db pg_dump -U edrev edrev > respaldo.sql`.

## Migración de los datos del Excel

`npm run migrar` (en `EdRev b`) carga los Excel de cada revista. Lo que no encaja en las listas del sistema se carga
vacío y aparece en la pantalla **Por corregir** de cada revista. Ejemplo de archivo: `EdRev b/db/plantilla_migracion.csv`;
si los encabezados del Excel real son distintos, se agregan sus nombres en `ALIAS` de `EdRev b/src/servicios/migracion.ts`.
