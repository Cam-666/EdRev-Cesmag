import { crearApp } from './app.js'
import { config } from './config.js'
import { pool } from './db.js'
import { iniciarEnvioCorreos } from './servicios/envioCorreos.js'
import { iniciarSegundoIntento } from './servicios/segundoIntento.js'

await pool.query('SELECT 1') // fails fast when DATABASE_URL is wrong
iniciarEnvioCorreos()
iniciarSegundoIntento()
crearApp().listen(config.puerto, () => {
  console.log(`API de EdRev Cesmag en http://localhost:${config.puerto}/api`)
})
