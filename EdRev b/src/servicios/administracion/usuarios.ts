/*
 * usuarios (servicio) — the rules of the user accounts (RF-40): a new account receives a link to
 * define its password, at least one active Administradora must always remain, and an account with
 * activity in the audit log cannot be deleted (it is disabled instead).
 */
import { enTransaccion, pool, type Cliente } from '../../db.js'
import { auditar } from '../../lib/auditoria.js'
import { crearEnlace, enlaceDemo } from '../../lib/enlaces.js'
import { ErrorHttp } from '../../lib/http.js'
import { usuarioApi, type FilaUsuario } from '../../lib/mapeo.js'
import { enviarEnlaceContrasena } from '../correoCuentas.js'

export type Perfil = 'administrador' | 'auxiliar'

export interface DatosNuevoUsuario {
  nombre: string
  correo: string
  perfil: Perfil
}

export interface CambiosUsuario {
  nombre?: string
  correo?: string
  perfil?: Perfil
  estado?: 'activo' | 'inhabilitado'
}

export async function listarUsuarios() {
  const { rows } = await pool.query<FilaUsuario>('SELECT * FROM usuario ORDER BY nombre')
  return rows.map(usuarioApi)
}

/** Creates the account and sends the link to define the password; returns what the page shows. */
export async function crearUsuario(datos: DatosNuevoUsuario, actor: number) {
  const creada = await enTransaccion(async (c) => {
    const existe = await c.query('SELECT 1 FROM usuario WHERE correo = $1', [datos.correo])
    if (existe.rows.length > 0) throw new ErrorHttp(409, 'Ya existe una cuenta con ese correo')
    const { rows } = await c.query<FilaUsuario>(
      `INSERT INTO usuario (nombre, correo, contrasena_hash, rol) VALUES ($1, $2, '-', $3) RETURNING *`,
      [datos.nombre, datos.correo, datos.perfil],
    )
    const nuevo = rows[0] as FilaUsuario
    const ruta = await crearEnlace(c, nuevo.id_usuario, 'activacion')
    await auditar(c, {
      usuario: actor,
      tabla: 'usuario',
      idRegistro: nuevo.id_usuario,
      accion: 'registro',
      texto: `Creó la cuenta de ${nuevo.nombre}`,
    })
    return { cuerpo: { ...usuarioApi(nuevo), ...enlaceDemo(ruta) }, ruta, nuevo }
  })
  enviarEnlaceContrasena(creada.nuevo.correo, creada.nuevo.nombre, 'activacion', creada.ruta)
  return creada.cuerpo
}

/** Fails when this account is the last active Administradora. */
async function exigirOtraAdministradora(c: Cliente, id: number): Promise<void> {
  const otras = await c.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM usuario WHERE rol = 'administrador' AND activo AND id_usuario <> $1",
    [id],
  )
  if ((otras.rows[0]?.n ?? 0) === 0) throw new ErrorHttp(409, 'Debe quedar al menos una administradora activa')
}

export async function editarUsuario(id: number, cambios: CambiosUsuario, actor: number) {
  const fila = await enTransaccion(async (c) => {
    const { rows } = await c.query<FilaUsuario>('SELECT * FROM usuario WHERE id_usuario = $1', [id])
    const actual = rows[0]
    if (!actual) throw new ErrorHttp(404, 'Usuario no encontrado')
    const quedaAdmin =
      (cambios.perfil ?? actual.rol) === 'administrador' &&
      (cambios.estado ?? (actual.activo ? 'activo' : 'inhabilitado')) === 'activo'
    if (actual.rol === 'administrador' && actual.activo && !quedaAdmin) await exigirOtraAdministradora(c, id)
    const { rows: nuevos } = await c.query<FilaUsuario>(
      `UPDATE usuario SET nombre = COALESCE($1, nombre), correo = COALESCE($2, correo),
              rol = COALESCE($3, rol), activo = COALESCE($4, activo)
        WHERE id_usuario = $5 RETURNING *`,
      [cambios.nombre ?? null, cambios.correo ?? null, cambios.perfil ?? null, cambios.estado ? cambios.estado === 'activo' : null, id],
    )
    await auditar(c, {
      usuario: actor,
      tabla: 'usuario',
      idRegistro: id,
      accion: 'edicion',
      texto: `Editó la cuenta de ${actual.nombre}`,
    })
    return nuevos[0] as FilaUsuario
  })
  return usuarioApi(fila)
}

export async function eliminarUsuario(id: number, actor: number): Promise<void> {
  if (actor === id) throw new ErrorHttp(409, 'No puede eliminar su propia cuenta')
  await enTransaccion(async (c) => {
    const { rows } = await c.query<FilaUsuario>('SELECT * FROM usuario WHERE id_usuario = $1', [id])
    const actual = rows[0]
    if (!actual) throw new ErrorHttp(404, 'Usuario no encontrado')
    if (actual.rol === 'administrador' && actual.activo) await exigirOtraAdministradora(c, id)
    // An account with activity in the audit log cannot disappear without breaking that history.
    await c.query('DELETE FROM usuario WHERE id_usuario = $1', [id]).catch((e: { code?: string }) => {
      if (e.code === '23503')
        throw new ErrorHttp(409, 'La cuenta tiene actividad registrada y no se puede eliminar; inhabilítela en su lugar')
      throw e
    })
    await auditar(c, {
      usuario: actor,
      tabla: 'usuario',
      idRegistro: id,
      accion: 'eliminacion',
      texto: `Eliminó la cuenta de ${actual.nombre}`,
    })
  })
}

/** Sends a new link to define the password. */
export async function reenviarEnlace(id: number) {
  const { rows } = await pool.query<FilaUsuario>('SELECT * FROM usuario WHERE id_usuario = $1', [id])
  const cuenta = rows[0]
  if (!cuenta) throw new ErrorHttp(404, 'Usuario no encontrado')
  if (!cuenta.activo) throw new ErrorHttp(409, 'La cuenta está inhabilitada')
  const ruta = await crearEnlace(pool, id, 'activacion')
  enviarEnlaceContrasena(cuenta.correo, cuenta.nombre, 'activacion', ruta)
  return enlaceDemo(ruta)
}
