/*
 * config — toda la configuración sale de variables de entorno, así el mismo código corre en el servidor
 * provisional, en Docker y en el servidor de la universidad sin modificarlo.
 */
function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (vea .env.example)`)
  return valor
}

/**
 * El secreto con que se firman los tokens de sesión y los enlaces de los correos. Debe ser largo y aleatorio:
 * con el texto de ejemplo de .env.example cualquiera podría falsificar un token. El servidor no arranca con un
 * secreto corto ni con el de ejemplo.
 */
export function secretoSeguro(valor: string): boolean {
  return valor.length >= 32 && !/cambi[ae]|ejemplo|secreto|changeme|password/i.test(valor)
}

function secretoJwt(): string {
  const valor = requerida('JWT_SECRET')
  if (!secretoSeguro(valor)) {
    throw new Error(
      'JWT_SECRET no es seguro: use una cadena aleatoria de al menos 32 caracteres. ' +
        "Genere una con: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    )
  }
  return valor
}

function numero(nombre: string, porDefecto: number): number {
  const valor = Number(process.env[nombre] ?? porDefecto)
  return Number.isFinite(valor) ? valor : porDefecto
}

export const config = {
  puerto: numero('PORT', 3000),
  origenes: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
  baseDatos: requerida('DATABASE_URL'),
  jwtSecreto: secretoJwt(),
  /** Dirección de la aplicación web, para los enlaces que viajan por correo (definir o recuperar contraseña). */
  urlFrontend: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  // Dirección pública del escudo del encabezado de los correos: por defecto, la que la universidad publica en su
  // propio sitio, para que se vea en cualquier cliente de correo aunque este sistema corra en un computador local.
  urlLogoCorreo: process.env.LOGO_CORREO_URL ?? 'https://www.unicesmag.edu.co/recursos/uploads/2022/04/Escudos_2-2-300x300.png',
  /** Dirección pública de la API: los correos toman el escudo de aquí si no se define LOGO_CORREO_URL. */
  urlApiPublica: (process.env.API_PUBLICA_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, ''),
  jwtHoras: numero('JWT_HORAS', 8),
  /** Zona horaria de la dependencia: define qué significa «hoy» al registrar una fecha de entrega. */
  zonaHoraria: process.env.ZONA_HORARIA ?? 'America/Bogota',
  umbralCoincidencias: numero('UMBRAL_COINCIDENCIAS', 15),
  diasEspera: numero('DIAS_ESPERA_RESPUESTA', 5),
  intentosAntesBloqueo: numero('INTENTOS_ANTES_BLOQUEO', 2),
  maxPares: numero('MAX_PARES_POR_ARTICULO', 3),
  /** Reintentos automáticos de un correo que falló por el servicio de correo, y los minutos entre un intento y otro. */
  reintentosCorreo: numero('REINTENTOS_CORREO', 3),
  minutosReintento: numero('MINUTOS_REINTENTO_CORREO', 10),
  /** Ingreso: intentos fallidos antes de bloquear la cuenta durante 15 minutos. */
  intentosIngreso: 3,
  bloqueoMinutos: 15,
} as const
