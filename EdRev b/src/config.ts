/*
 * config — every setting comes from environment variables (RNF-07, RNF-13), so the same build
 * runs on the provisional server, in Docker and on the university server.
 */
function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (vea .env.example)`)
  return valor
}

/**
 * The secret that signs the session tokens and the links of the mails. It must be long and random:
 * with the example text of .env.example anyone could forge a token. The server refuses to start
 * with a short secret or with the example one.
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
  /** Address of the app, for the links that go by mail (password links). */
  urlFrontend: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
  // Public address of the shield shown in the header of the mails: the one the university publishes
  // on its own site, so it shows in any mail client even when this system runs on a local computer.
  urlLogoCorreo: process.env.LOGO_CORREO_URL ?? 'https://www.unicesmag.edu.co/recursos/uploads/2022/04/Escudos_2-2-300x300.png',
  /** Public address of the API, for the images of the mails (the footer image of a template). */
  urlApiPublica: (process.env.API_PUBLICA_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, ''),
  jwtHoras: numero('JWT_HORAS', 8),
  umbralCoincidencias: numero('UMBRAL_COINCIDENCIAS', 15),
  diasEspera: numero('DIAS_ESPERA_RESPUESTA', 5),
  intentosAntesBloqueo: numero('INTENTOS_ANTES_BLOQUEO', 2),
  maxPares: numero('MAX_PARES_POR_ARTICULO', 3),
  /** Automatic retries of a mail the service failed (RF-27) and the minutes between them. */
  reintentosCorreo: numero('REINTENTOS_CORREO', 3),
  minutosReintento: numero('MINUTOS_REINTENTO_CORREO', 10),
  /** Login: failed attempts before a 15-minute lockout. */
  intentosIngreso: 3,
  bloqueoMinutos: 15,
} as const
