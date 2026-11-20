/* entorno — se ejecuta antes de cada archivo de pruebas: carga el .env y apunta la API a la base de pruebas. */
import { urlDePrueba } from './baseDePrueba.js'

process.loadEnvFile('.env')
// Las pruebas no dependen del secreto de quien desarrolla: usan uno propio, largo y fijo.
process.env.JWT_SECRET = 'k3Jx9QmZ7vP2tR8wYb4nHc6LdF1sGe5UoA0iXzTqVyWrNm'
process.env.DATABASE_URL = urlDePrueba()
process.env.CORREO_MODO = 'apagado'
process.env.ENLACE_DEMO = 'true'
