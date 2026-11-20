/*
 * errores — los últimos middlewares de la aplicación: qué responder cuando ninguna ruta coincide y cómo se
 * convierte cada error en { mensaje }, la misma forma que usa la API simulada de la interfaz, para que se
 * muestren los mismos mensajes. Los errores conocidos conservan su código; el resto es un 500 que nunca
 * filtra detalles al cliente.
 */
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { ErrorHttp } from '../lib/http.js'

export function rutaNoEncontrada(_req: Request, res: Response): void {
  res.status(404).json({ mensaje: 'Recurso no encontrado' })
}

export function manejadorErrores(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ErrorHttp) {
    res.status(error.estado).json({ mensaje: error.message, ...error.cuerpo })
    return
  }
  if (error instanceof ZodError) {
    res.status(422).json({ mensaje: error.issues[0]?.message ?? 'Datos no válidos' })
    return
  }
  // Un cuerpo mal formado o demasiado grande, o un archivo que pasa su límite, es error del cliente.
  const cliente = error as { status?: number; type?: string; name?: string; code?: string }
  if (cliente.type === 'entity.parse.failed') {
    res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es un JSON válido' })
    return
  }
  if (cliente.type === 'entity.too.large' || cliente.status === 413) {
    res.status(413).json({ mensaje: 'La solicitud es demasiado grande' })
    return
  }
  if (cliente.name === 'MulterError') {
    const grande = cliente.code === 'LIMIT_FILE_SIZE'
    res.status(grande ? 413 : 422).json({ mensaje: grande ? 'La imagen no puede pesar más de 2 MB' : 'No se pudo leer el archivo adjunto' })
    return
  }
  const pg = error as { code?: string; message?: string }
  if (pg.code === '23505') {
    res.status(409).json({ mensaje: 'Ya existe un registro con esos datos' })
    return
  }
  if (pg.code === 'P0001' || pg.code === '23514') {
    res.status(409).json({ mensaje: pg.message ?? 'La base de datos rechazó el cambio' })
    return
  }
  console.error(error)
  res.status(500).json({ mensaje: 'Error interno del servidor' })
}
