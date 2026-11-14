/*
 * config — every setting comes from environment variables (RNF-07, RNF-13), so the same build
 * runs on the provisional server, in Docker and on the university server.
 */
function requerida(nombre: string): string {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (vea .env.example)`)
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
  jwtSecreto: requerida('JWT_SECRET'),
  /** Address of the app, for the links that go by mail (password links). */
  urlFrontend: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''),
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
