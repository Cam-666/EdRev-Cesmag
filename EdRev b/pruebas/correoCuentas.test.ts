/*
 * Pruebas del correo con el enlace de contraseña
 */
import { describe, expect, it } from 'vitest'
import { textoEnlace } from '../src/servicios/correoCuentas.js'

describe('correo del enlace de contraseña', () => {
  it('lleva el enlace, su vigencia y distingue activación de recuperación', () => {
    const url = 'http://localhost:5173/acceso/contrasena?token=abc'
    const activacion = textoEnlace('Ana Pérez', 'activacion', url)
    const recuperacion = textoEnlace('Ana Pérez', 'recuperacion', url)
    expect(activacion.asunto).toContain('Active su cuenta')
    expect(recuperacion.asunto).toContain('Recupere su contraseña')
    for (const c of [activacion, recuperacion]) {
      expect(c.texto).toContain(url)
      expect(c.texto).toContain('30 minutos')
      expect(c.texto).toContain('Ana Pérez')
    }
  })
})
