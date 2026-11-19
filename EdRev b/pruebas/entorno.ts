/*
 * entorno — runs before each test file: loads .env and points the API to the test database.
 */
import { urlDePrueba } from './baseDePrueba.js'

process.loadEnvFile('.env')
// The tests do not depend on the secret of the developer: they use their own, long and fixed.
process.env.JWT_SECRET = 'k3Jx9QmZ7vP2tR8wYb4nHc6LdF1sGe5UoA0iXzTqVyWrNm'
process.env.DATABASE_URL = urlDePrueba()
process.env.CORREO_MODO = 'apagado'
process.env.ENLACE_DEMO = 'true'
