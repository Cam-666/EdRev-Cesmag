/*
 * Pruebas del correo con el enlace de contraseña
 */
import { describe, expect, it } from 'vitest'
import { marcoInstitucional } from '../src/lib/marcoCorreo.js'
import { cuerpoHtml, textoEnlace } from '../src/servicios/correoCuentas.js'

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

  it('el correo HTML lleva el marco institucional, el botón y el enlace escrito', () => {
    const url = 'http://localhost:8080/acceso/contrasena?token=abc&x=1'
    for (const motivo of ['activacion', 'recuperacion'] as const) {
      const html = marcoInstitucional({
        tipo: motivo,
        revista: 'Sistema de Gestión Editorial',
        contacto: 'editorial@ejemplo.edu.co',
        contenido: cuerpoHtml('Ana <Pérez>', motivo, url),
      })
      expect(html).toContain('UNIVERSIDAD')
      expect(html).toContain(motivo === 'activacion' ? 'Active su cuenta' : 'Recupere su contraseña')
      expect(html).toContain('Definir mi contraseña')
      expect(html).toContain('href="http://localhost:8080/acceso/contrasena?token=abc&amp;x=1"')
      expect(html).toContain('30 minutos')
      expect(html).toContain('VIGILADA MINEDUCACIÓN')
      // el nombre se escapa: no puede colar HTML
      expect(html).toContain('Ana &lt;Pérez&gt;')
      expect(html).not.toContain('Ana <Pérez>')
    }
  })
})
