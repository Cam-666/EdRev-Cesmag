/*
 * server — punto de entrada: comprueba la conexión a la base de datos, arranca las dos tareas de fondo
 * (el envío de correos y el segundo intento de invitación) y abre el puerto de la API.
 * Si algo falla al arrancar (base de datos inaccesible, JWT_SECRET inseguro) el proceso se detiene y lo
 * dice en la consola; el detalle de cada variable está en .env.example.
 */
import { crearApp } from './app.js'
import { config } from './config.js'
import { pool } from './db.js'
import { asegurarEsquema } from './esquema.js'
import { iniciarEnvioCorreos } from './servicios/envioCorreos.js'
import { iniciarSegundoIntento } from './servicios/segundoIntento.js'

await pool.query('SELECT 1') // si DATABASE_URL está mal, falla de inmediato y con un mensaje claro
await asegurarEsquema(pool) // pone al día una base creada con una versión anterior (idempotente)
// Tareas de fondo: corren en este mismo proceso, cada una con su propio temporizador.
iniciarEnvioCorreos() // envía los correos «en cola» (según CORREO_MODO)
iniciarSegundoIntento() // reenvía la invitación y bloquea a los pares que no responden
crearApp().listen(config.puerto, () => {
  console.log(`API de EdRev Cesmag en http://localhost:${config.puerto}/api`)
})
