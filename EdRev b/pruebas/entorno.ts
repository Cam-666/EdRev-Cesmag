/*
 * entorno — runs before each test file: loads .env and points the API to the test database.
 */
import { urlDePrueba } from './baseDePrueba.js'

process.loadEnvFile('.env')
process.env.DATABASE_URL = urlDePrueba()
process.env.CORREO_MODO = 'apagado'
process.env.ENLACE_DEMO = 'true'
