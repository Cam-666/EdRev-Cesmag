# Arquitectura del proyecto

Frontend del Sistema de Gestión Editorial (Universidad CESMAG). Organización por módulos funcionales y
separación de responsabilidades, según la revisión de Ingeniería de Software.

## Ubicación en el repositorio

```
EdRev Cesmag/        raíz del repositorio (Git)
  EdRev f/           frontend (este proyecto)
  <backend>/         carpeta hermana cuando exista el backend (fuera del alcance de esta etapa)
```

Todos los comandos (`npm run dev`, `build`, `typecheck`, `lint`, `test`) se ejecutan dentro de `EdRev f/`.

## Estructura

```
src/
  app/            Composición: rutas, layouts y proveedores. Es lo único que conoce todo lo demás.
    routes/       publicas.tsx · privadas.tsx · index.tsx   (equivalente a routes/public y routes/private)
  modules/        Un módulo por funcionalidad. Una sola implementación sirve a las dos revistas.
    <modulo>/
      pages/        Pantallas (una por ruta). Solo componen; no tienen reglas de negocio.
      components/   Componentes propios del módulo (presentación).
      hooks/        Estado y lógica de negocio del módulo (TanStack Query, formularios).
      services/     Acceso a datos del módulo: llamadas a lib/api. Nada de fetch en componentes.
      config/       Configuración específica del módulo (reglas, constantes, esquemas de validación).
    acceso · administracion · articulos · autores · pares · constancias · correos · inicio · informes
  components/
    common/       Componentes reutilizables y sin lógica de negocio (Boton, Tabla, Modal…).
  styles/         Estilos globales (index.css).
  theme/          Tokens de diseño: tokens.css (variables) y tailwind-theme.ts (tema de Tailwind).
  lib/            Utilidades transversales: api/ (cliente HTTP), revista/ (contexto), format, cn.
  types/          Modelos de dominio compartidos.
  mocks/          Datos semilla y handlers de MSW (solo mientras no exista backend).
  test/           Configuración de pruebas.
```

Todos los módulos tienen exactamente la misma forma (`components/`, `pages/`, `hooks/`, `services/`,
`config/`), de modo que incorporar un módulo nuevo es copiar la plantilla. Las carpetas aún sin contenido se
mantienen con un `.gitkeep` hasta la fase que las llena.

## Reglas de dependencia (las hace cumplir ESLint)

```
app  →  modules  →  components/common · lib · types · theme
```

- `components/`, `lib/` y `types/` **no** importan de `modules/` ni de `app/`.
- `modules/` **no** importa de `app/`.
- Los tokens (colores, espaciado, radios) viven solo en `theme/`. Los componentes usan clases de Tailwind
  derivadas de esos tokens; no hay estilos en línea.

## Autenticación y autorización centralizadas

| Pieza                     | Ubicación                                  | Función                                           |
| ------------------------- | ------------------------------------------ | ------------------------------------------------- |
| Sesión                    | `modules/acceso/components/SesionProvider` | Único lugar que guarda quién ingresó.             |
| Rutas públicas / privadas | `app/routes/publicas.tsx` · `privadas.tsx` | Qué requiere sesión y qué no.                     |
| Guarda de autenticación   | `modules/acceso/components/RutaPrivada`    | Sin sesión redirige a `/acceso`.                  |
| Guarda de autorización    | `modules/acceso/components/RutaPorPermiso` | Bloquea según el perfil.                          |
| Permisos por perfil       | `modules/acceso/config/permisos.ts`        | Única tabla perfil → acciones (RNF-05).           |
| Cliente HTTP              | `lib/api/cliente.ts`                       | Único punto que adjunta el token `Authorization`. |

## Backend (fuera del alcance de esta etapa)

Cuando exista el backend, las recomendaciones de la revisión se aplican así; el frontend ya está preparado
(las llamadas pasan por `lib/api`, MSW solo se apaga):

- `routes/public/` y `routes/private/`; las privadas detrás de un middleware que valide el JWT: **firma,
  expiración y rol/permisos** del usuario (no basta con recibir el token).
- `middlewares/` (autenticación, validación del JWT, errores, permisos), `controllers/`, `services/`, `models/`.
- El control de acceso del frontend es solo de experiencia de usuario: **la autorización real la hace el
  backend** en cada petición (RNF-05, RNF-04).

## Marca y recursos gráficos

La plataforma se llama **EdRev Cesmag**. Los recursos de la universidad viven en `src/assets/` ya
optimizados: `escudo-cesmag.webp` (escudo, 21 KB; también es el favicon) y `fondo-cesmag.jpg` (fotografía
aérea del campus para las pantallas de acceso, 340 KB; el original pesaba 7 MB). El escudo se usa solo a
través del componente `components/common/Escudo`, y la fotografía solo en `FondoAcceso`.

## Datos simulados y acceso de demostración (MSW)

Mientras no exista backend, MSW responde a `lib/api` (se activa en `main.tsx`; se apaga con
`VITE_USE_MOCKS=false`). Los handlers viven en `src/mocks/handlers/`.

| Usuario            | Correo                            | Perfil                  |
| ------------------ | --------------------------------- | ----------------------- |
| Ma. Camila Mendoza | `maria.mendoza@unicesmag.edu.co`  | Administradora          |
| Andrea Villota     | `andrea.villota@unicesmag.edu.co` | Auxiliar                |
| Daniela Ortiz      | `daniela.ortiz@unicesmag.edu.co`  | Auxiliar (inhabilitada) |

Contraseña de todos: `Editorial2026*` (solo en el mock). Tres intentos fallidos bloquean la cuenta 15
minutos. Una vez dentro, el recuadro "Demostración · Usuario" cambia entre las cuentas activas para mostrar
los permisos de cada perfil.

## Cómo demostrar un correo rebotado

En la API simulada, un par cuyo correo termina en `@invalido.test` hace que la invitación rebote. Para
verlo: registre un par con ese correo, asígnelo a un artículo (la invitación aparece como rebotada y la
asignación se conserva), corrija el correo desde la ficha del par y use «Reenviar invitación».

## Constancias, correos, paneles y administración (fase 6)

- `modules/constancias`: pendientes y emitidas; la constancia pasa a «pendiente» al entregar la evaluación y se
  emite con «Emitir y enviar» (o «Emitir pendientes»). Cada emisión envía el correo de
  agradecimiento y queda en Correos enviados y en la auditoría. La descarga simula el PDF con HTML.
- `modules/correos`: bitácora por revista con contadores, «Reintentar fallidos» y «Corregir y reenviar»
  (el correo fallido queda «Reintentado»).
- `modules/inicio`: Tablero por revista (pares sin responder, constancias pendientes) e Inicio
  (resumen de ambas revistas, cada tarjeta con los colores de su revista, y «Pendiente»).
- `modules/informes`: informe comparativo para ambos perfiles; exporta CSV.
- `modules/administracion`: usuarios, plantillas (invitación, agradecimiento, constancia) con validación de
  marcadores, cuenta remitente por revista y auditoría de ambas revistas. Se pueden crear plantillas nuevas
  para cualquiera de los tres usos: parten del texto de la que está en uso y solo se envían cuando se elige
  «Usar en los envíos» (hay exactamente una en uso por cada uso).
- Las plantillas y cuentas son estado compartido del mock (`mocks/db.ts`); cambiarlas afecta los siguientes
  envíos sin tocar código (RNF-19). Las credenciales de las cuentas nunca viajan al frontend.

## Permisos, acciones de pantalla y pares (ajustes previos a la fase 7)

- Permisos (`modules/acceso/config/permisos.ts`, tabla única): la Auxiliar hace todo el trabajo editorial de
  ambas revistas; solo Administración (usuarios, plantillas, cuentas, auditoría) queda para la
  Administradora. Informes e Inicio son para ambos perfiles; el panel lateral oculta Administración a la
  Auxiliar y el mock responde 403 si lo intenta por la API.
- Las acciones de cada pantalla («Registrar artículo», «Editar», «Asignar par»…) van junto al título, en el
  contenido (`components/common/EncabezadoPagina`), no en la barra de la revista.
- Pares: cada revista tiene su propia base (no se comparten). Las invitaciones corren en paralelo: hasta tres
  pares vigentes por artículo; quien acepta sigue con su evaluación mientras se buscan los demás, y quien no
  acepta queda en la lista pero libera su lugar para invitar a otro (`paresVigentes` en
  `modules/articulos/config/reglas.ts`). `orden` es el orden de asignación.
- Sin recuadros que expliquen el uso del sistema: solo avisos de estado (errores, conflictos, rebotes, éxito).
