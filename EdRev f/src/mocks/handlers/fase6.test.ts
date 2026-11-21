import { AUXILIAR } from '../seed/usuarios'
import { json, llamar } from '@/test/llamarApi'
import type { ArticuloDetalle, RespuestaListado } from '@/types/articulo'
import type {
  RespuestaConstancias,
  ResultadoEmision,
  ResultadoEmisionMasiva,
  VistaConstancia,
} from '@/types/constancia'
import type { HistorialArticulo } from '@/types/historial'
import type { Informe, ResumenGeneral, Tablero } from '@/types/panel'
import type { DatosPlantillas, Plantilla } from '@/types/plantilla'
import type { ResultadoAsignacion } from '@/types/par'
import type { Usuario } from '@/types/usuario'

function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface RespuestaCorreos {
  items: Array<{
    id: string
    estado: string
    destinatario: string
    tipo: string
    atendido: boolean
  }>
  total: number
  enviados: number
  rebotados: number
  fallidos: number
  enCola: number
}

const CANDIDATO = {
  nombre: 'Candidato de prueba',
  correo: 'candidato.prueba@udenar.edu.co',
  universidad: 'Universidad Externa de Prueba',
  area: 'Educación rural',
}

function aprobar(id: string) {
  return llamar(`/reep/articulos/${id}/rondas`, {
    metodo: 'POST',
    cuerpo: { coincidencias: 5, atribuidoIa: 1, resultado: 'aprobado', observacion: '' },
  })
}

/** Invita a un candidato nuevo a 2026-033 (aprobado) y devuelve el asunto de esa invitación. */
async function asuntoDeLaInvitacion(n = 1): Promise<string> {
  await llamar('/reep/articulos/2026-033/asignaciones', {
    metodo: 'POST',
    cuerpo: {
      nuevo: { ...CANDIDATO, nombre: `${CANDIDATO.nombre} ${n}`, correo: `candidato${n}@udenar.edu.co` },
    },
  })
  const h = await json<{ correos: Array<{ tipo: string; asunto: string }> }>(
    await llamar('/reep/articulos/2026-033/historial'),
  )
  return h.correos.find((c) => c.tipo === 'invitacion')?.asunto ?? ''
}

describe('constancias API (mock)', () => {
  it('lists pending and issued constancias of the journal only', async () => {
    const reep = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    const ire = await json<RespuestaConstancias>(await llamar('/ire/constancias'))
    expect(reep.pendientes.length).toBeGreaterThan(0)
    expect(reep.emitidas.length).toBeGreaterThan(0)
    expect(reep.pendientes.every((f) => f.estado === 'pendiente' && f.fechaEmision === null)).toBe(
      true,
    )
    expect(reep.pendientes.some((f) => f.origen === 'migrado')).toBe(true)
    expect(reep.pendientes.some((f) => f.origen === 'sistema')).toBe(true)
    const ids = new Set(reep.pendientes.map((f) => f.id))
    expect(ire.pendientes.some((f) => ids.has(f.id))).toBe(false)
    expect(reep.pendientes.map((f) => f.par.nombre)).toContain('Luz Marina Burbano')
  })

  it('renders the preview from the template: only name and title change, no consecutive', async () => {
    const { pendientes } = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    const fila = pendientes[0]
    if (!fila) throw new Error('no pending constancia in the seed')
    const v = await json<VistaConstancia>(await llamar(`/reep/constancias/${fila.id}/vista-previa`))
    expect(v.universidad).toBe('UNIVERSIDAD CESMAG')
    expect(v.revista).toBe('Revista Electrónica en Educación y Pedagogía')
    expect(v.cuerpo).toContain('CERTIFICA QUE')
    expect(v.cuerpo).toContain(fila.par.nombre.toUpperCase())
    expect(v.cuerpo).toContain(`«${fila.articulo.titulo}»`)
    expect(v.cuerpo).not.toMatch(/\{\{|consecutivo|N\.º|No\. \d/i)
    expect(v.firma).toBe('Ma. Camila Mendoza · Dependencia de Editorial')
  })

  it('issuing without the thank-you option sends only the constancia', async () => {
    const { pendientes } = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    const fila = pendientes.find((f) => f.articulo.id === '2026-031')
    if (!fila) throw new Error('missing 2026-031')

    const r = await llamar(`/reep/constancias/${fila.id}/emitir`, {
      metodo: 'POST',
      cuerpo: { conAgradecimiento: false },
    })
    expect(r.status).toBe(200)
    const h = await json<HistorialArticulo>(await llamar('/reep/articulos/2026-031/historial'))
    expect(h.correos[0]).toMatchObject({ tipo: 'constancia', destinatario: fila.par.correo })
  })

  it('issuing sends the thank-you mail and leaves a trace', async () => {
    const { pendientes } = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    const fila = pendientes.find((f) => f.articulo.id === '2026-031')
    if (!fila) throw new Error('missing 2026-031')

    const r = await llamar(`/reep/constancias/${fila.id}/emitir`, { metodo: 'POST' })
    expect(r.status).toBe(200)
    const res = await json<ResultadoEmision>(r)
    expect(res.constancia.estado).toBe('emitida')
    expect(res.correo).toEqual({ estado: 'enviado', destinatario: fila.par.correo })

    const h = await json<HistorialArticulo>(await llamar('/reep/articulos/2026-031/historial'))
    expect(h.correos[0]).toMatchObject({
      tipo: 'agradecimiento',
      destinatario: fila.par.correo,
      estado: 'enviado',
    })
    expect(
      h.auditoria.some(
        (a) => a.accion === 'Emitió una constancia' && a.usuario === 'Ma. Camila Mendoza',
      ),
    ).toBe(true)

    expect((await llamar(`/reep/constancias/${fila.id}/emitir`, { metodo: 'POST' })).status).toBe(
      409,
    )
  })

  it('issue all pending: every one becomes issued and has its own mail', async () => {
    const antes = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    const r = await json<ResultadoEmisionMasiva>(
      await llamar('/reep/constancias/emitir-pendientes', { metodo: 'POST' }),
    )
    expect(r.emitidas).toBe(antes.pendientes.length)
    const despues = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    expect(despues.pendientes).toHaveLength(0)
    expect(despues.emitidas).toHaveLength(antes.emitidas.length + antes.pendientes.length)
    // La otra revista no se toca
    const ire = await json<RespuestaConstancias>(await llamar('/ire/constancias'))
    expect(ire.pendientes.length).toBeGreaterThan(0)
  })

  it('reissuing resends an issued constancia and refuses a pending one', async () => {
    const { emitidas, pendientes } = await json<RespuestaConstancias>(
      await llamar('/reep/constancias'),
    )
    const emitida = emitidas[0]
    const pendiente = pendientes[0]
    if (!emitida || !pendiente) throw new Error('seed missing')
    expect(
      (await llamar(`/reep/constancias/${pendiente.id}/reenviar`, { metodo: 'POST' })).status,
    ).toBe(409)
    const r = await llamar(`/reep/constancias/${emitida.id}/reenviar`, { metodo: 'POST' })
    expect(r.status).toBe(200)
    const h = await json<HistorialArticulo>(
      await llamar(`/reep/articulos/${emitida.articulo.id}/historial`),
    )
    expect(h.auditoria.some((a) => a.accion === 'Reemitió una constancia')).toBe(true)
  })

  it('a delivered evaluation with no constancia record shows up as pending', async () => {
    const a = await json<ArticuloDetalle>(
      await llamar('/reep/articulos', {
        metodo: 'POST',
        cuerpo: {
          numeroOjs: '2026-090',
          titulo: 'Prueba',
          tipo: 'revision',
          fechaPostulacion: '2026-10-01',
          autores: [{ autorId: 'reep-au-3' }],
        },
      }),
    )
    await aprobar(a.id)
    const asig = await json<ResultadoAsignacion>(
      await llamar(`/reep/articulos/${a.id}/asignaciones`, {
        metodo: 'POST',
        cuerpo: { nuevo: CANDIDATO },
      }),
    )
    await llamar(`/reep/asignaciones/${asig.asignacion.id}/respuesta`, {
      metodo: 'POST',
      cuerpo: { respuesta: 'acepto' },
    })
    await llamar(`/reep/asignaciones/${asig.asignacion.id}/entrega`, {
      metodo: 'POST',
      cuerpo: { fecha: hoy() },
    })
    const { pendientes } = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    expect(pendientes.find((f) => f.articulo.id === a.id)).toMatchObject({
      origen: 'sistema',
      estado: 'pendiente',
    })
  })

  it('a bounced address is reported and the constancia is still generated', async () => {
    const { pendientes } = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    const fila = pendientes[0]
    if (!fila) throw new Error('seed missing')
    await llamar(`/reep/pares/${fila.par.id}`, {
      metodo: 'PATCH',
      cuerpo: { correo: 'par@invalido.test' },
    })
    const res = await json<ResultadoEmision>(
      await llamar(`/reep/constancias/${fila.id}/emitir`, { metodo: 'POST' }),
    )
    expect(res.constancia.estado).toBe('emitida')
    expect(res.correo.estado).toBe('rebotado')
  })
})

describe('templates API', () => {
  it('each journal has its own templates for each use; Administradora only', async () => {
    expect((await llamar('/plantillas', { usuario: AUXILIAR })).status).toBe(403)
    const d = await json<DatosPlantillas>(await llamar('/plantillas'))
    expect(d.plantillas.filter((p) => p.revista === 'reep').map((p) => p.id)).toEqual([
      'reep-invitacion',
      'reep-agradecimiento',
      'reep-constancia',
      'reep-invitacion-breve',
      'reep-agradecimiento-breve',
      'reep-mensaje',
    ])
    // por cada revista, una invitación, un agradecimiento y una constancia son los habituales; las demás no lo son
    for (const revista of ['reep', 'ire']) {
      for (const fin of ['invitacion', 'agradecimiento', 'constancia']) {
        expect(d.plantillas.filter((p) => p.revista === revista && p.fin === fin && p.enUso)).toHaveLength(1)
      }
    }
    expect(d.plantillas.filter((p) => p.fin === 'mensaje').every((p) => !p.enUso)).toBe(true)
    // Solo la constancia (una plantilla de archivo) lleva imágenes de encabezado, pie y firma
    expect(d.plantillas.filter((p) => p.imagenes).map((p) => p.id)).toEqual([
      'reep-constancia',
      'ire-constancia',
    ])
    expect(JSON.stringify(d)).not.toMatch(/password|contrase|secret/i)
  })

  it("an edited constancia template changes only its journal's next constancia", async () => {
    const nuevo = '[centro]**HACE CONSTAR QUE**\n\n{{par}}\n\nevaluó con dedicación el artículo «{{articulo}}».'
    expect(
      (
        await llamar('/plantillas/reep-constancia', {
          metodo: 'PUT',
          cuerpo: { asunto: null, cuerpo: nuevo },
        })
      ).status,
    ).toBe(200)
    const vista = async (revista: 'reep' | 'ire') => {
      const { pendientes } = await json<RespuestaConstancias>(
        await llamar(`/${revista}/constancias`),
      )
      const fila = pendientes[0]
      if (!fila) throw new Error('seed missing')
      return json<VistaConstancia>(await llamar(`/${revista}/constancias/${fila.id}/vista-previa`))
    }
    const reep = await vista('reep')
    expect(reep.cuerpo).toContain('evaluó con dedicación')
    expect(reep.fondo).toContain('Encabezado, pie y firma')
    const ire = await vista('ire')
    expect(ire.cuerpo).not.toContain('evaluó con dedicación')
    expect(ire.fondo).toContain('Encabezado, pie y firma')
  })

  it('refuses unknown markers; no marker is mandatory (a template is written freely)', async () => {
    const put = (id: string, cuerpo: string, asunto: string | null = null) =>
      llamar(`/plantillas/${id}`, { metodo: 'PUT', cuerpo: { asunto, cuerpo } })
    expect(
      (await put('reep-constancia', 'HACE CONSTAR QUE {{par}} {{articulo}} {{numeroConstancia}}'))
        .status,
    ).toBe(422)
    expect((await put('reep-constancia', 'HACE CONSTAR QUE {{par}}')).status).toBe(200)
    expect((await put('reep-invitacion', 'Hola, un texto sin marcadores', 'Asunto')).status).toBe(200)
    expect((await put('reep-constancia', '   ')).status).toBe(422)
  })

  it("an edited invitation template is used by its journal's next invitation", async () => {
    await llamar('/plantillas/reep-invitacion', {
      metodo: 'PUT',
      cuerpo: {
        asunto: 'Nueva invitación · {{revista}}',
        cuerpo: 'Estimado(a) {{par}}, evalúe «{{articulo}}».',
      },
    })
    expect(await asuntoDeLaInvitacion()).toBe(
      'Nueva invitación · Revista Electrónica en Educación y Pedagogía',
    )
  })

  it('a new template asks for its journal, a name and what it is for; it is blank and its use never changes', async () => {
    const datos = { revista: 'reep', nombre: 'Invitación formal', fin: 'invitacion' }
    expect(
      (await llamar('/plantillas', { metodo: 'POST', usuario: AUXILIAR, cuerpo: datos })).status,
    ).toBe(403)
    expect(
      (await llamar('/plantillas', { metodo: 'POST', cuerpo: { ...datos, nombre: ' ' } })).status,
    ).toBe(422)
    // hay que decir para qué es, y la constancia no se crea
    expect((await llamar('/plantillas', { metodo: 'POST', cuerpo: { revista: 'reep', nombre: 'Sin uso' } })).status).toBe(422)
    expect((await llamar('/plantillas', { metodo: 'POST', cuerpo: { ...datos, nombre: 'Otra', fin: 'constancia' } })).status).toBe(422)
    const r = await llamar('/plantillas', { metodo: 'POST', cuerpo: datos })
    expect(r.status).toBe(201)
    const nueva = await json<Plantilla>(r)
    expect(nueva).toMatchObject({ revista: 'reep', uso: null, enUso: false, fin: 'invitacion', clase: 'correo' })
    expect(nueva.cuerpo).toBe('') // a new template is blank
    expect((await llamar('/plantillas', { metodo: 'POST', cuerpo: datos })).status).toBe(409)
    // El mismo nombre está bien en la otra revista
    const enIre = await llamar('/plantillas', { metodo: 'POST', cuerpo: { ...datos, revista: 'ire' } })
    expect(enIre.status).toBe(201)

    // una invitación acepta {{par}} y {{articulo}}; {{nombre}} es de los mensajes
    const conNombre = await llamar(`/plantillas/${nueva.id}`, {
      metodo: 'PUT',
      cuerpo: { asunto: 'Hola · {{revista}}', cuerpo: 'Hola {{nombre}}' },
    })
    expect(conNombre.status).toBe(422)
    const bien = await llamar(`/plantillas/${nueva.id}`, {
      metodo: 'PUT',
      cuerpo: { asunto: 'Hola · {{revista}}', cuerpo: 'Hola {{par}}, ¿evalúa «{{articulo}}»?', fin: 'mensaje' },
    })
    expect(bien.status).toBe(200)
    // el fin nunca cambia, aunque se envíe
    expect((await json<Plantilla>(bien)).fin).toBe('invitacion')

    // se deja como la habitual: la anterior pasa a ser una más
    const marcada = await llamar(`/plantillas/${nueva.id}/predeterminada`, { metodo: 'POST' })
    expect(marcada.status).toBe(200)
    const d = await json<DatosPlantillas>(await llamar('/plantillas'))
    expect(d.plantillas.filter((p) => p.revista === 'reep' && p.fin === 'invitacion' && p.enUso).map((p) => p.id)).toEqual([nueva.id])
    // y no se elimina mientras es la habitual
    expect((await llamar(`/plantillas/${nueva.id}`, { metodo: 'DELETE' })).status).toBe(409)
    await llamar('/plantillas/reep-invitacion/predeterminada', { metodo: 'POST' })
    expect((await llamar(`/plantillas/${nueva.id}`, { metodo: 'DELETE' })).status).toBe(204)
    // la constancia y los mensajes no tienen habitual; una en blanco tampoco puede serlo
    expect((await llamar('/plantillas/reep-constancia/predeterminada', { metodo: 'POST' })).status).toBe(409)
    expect((await llamar('/plantillas/reep-mensaje/predeterminada', { metodo: 'POST' })).status).toBe(409)
    const blanca = await json<Plantilla>(await llamar('/plantillas', { metodo: 'POST', cuerpo: { revista: 'reep', nombre: 'En blanco', fin: 'agradecimiento' } }))
    expect((await llamar(`/plantillas/${blanca.id}/predeterminada`, { metodo: 'POST' })).status).toBe(422)
  })

  it('the habitual template cannot be deleted; the others can', async () => {
    const creada = await json<Plantilla>(
      await llamar('/plantillas', {
        metodo: 'POST',
        cuerpo: { revista: 'ire', nombre: 'Para eliminar', fin: 'mensaje' },
      }),
    )
    expect((await llamar('/plantillas/ire-invitacion', { metodo: 'DELETE' })).status).toBe(409)
    expect((await llamar(`/plantillas/${creada.id}`, { metodo: 'DELETE' })).status).toBe(204)
    expect((await llamar(`/plantillas/${creada.id}`, { metodo: 'DELETE' })).status).toBe(404)
  })

  it('the constancia is permanent: it is only edited', async () => {
    expect((await llamar('/plantillas/ire-constancia', { metodo: 'DELETE' })).status).toBe(409)
    // una plantilla nueva nunca es una constancia
    expect((await llamar('/plantillas', { metodo: 'POST', cuerpo: { revista: 'ire', nombre: 'Constancia 2027', fin: 'constancia' } })).status).toBe(422)
  })

  it('the editorial staff gets the templates to choose from when sending: the habitual one first', async () => {
    const lista = await json<Array<{ id: string; predeterminada: boolean }>>(await llamar('/reep/correos/plantillas?fin=invitacion', { usuario: AUXILIAR }))
    expect(lista[0]).toMatchObject({ id: 'reep-invitacion', predeterminada: true })
    expect(lista.map((p) => p.id)).toContain('reep-invitacion-breve')
    expect((await llamar('/ire/correos/plantillas?fin=invitacion')).status).toBe(200)
    expect((await llamar('/reep/correos/plantillas?fin=mensaje')).status).toBe(422)
  })
})

describe('sent-mail API (mock)', () => {
  it('lists the journal log with the four results, counters and filters', async () => {
    const r = await json<RespuestaCorreos>(await llamar('/reep/correos?porPagina=100'))
    expect(r.total).toBe(r.items.length)
    expect(r.rebotados).toBeGreaterThan(0)
    expect(r.fallidos).toBeGreaterThan(0)
    expect(
      r.items.every((c) => ['en-cola', 'enviado', 'rebotado', 'fallido'].includes(c.estado)),
    ).toBe(true)
    expect(
      r.items.every((c) =>
        ['invitacion', 'segundo-intento', 'reenvio', 'agradecimiento'].includes(c.tipo),
      ),
    ).toBe(true)
    const rebotados = await json<RespuestaCorreos>(await llamar('/reep/correos?estado=rebotado'))
    expect(rebotados.items.every((c) => c.estado === 'rebotado')).toBe(true)
    const invitaciones = await json<RespuestaCorreos>(
      await llamar('/reep/correos?tipo=invitacion&porPagina=100'),
    )
    expect(invitaciones.items.every((c) => c.tipo === 'invitacion')).toBe(true)
  })

  it('a failed send is retried as it is; a bounced one needs a corrected address', async () => {
    const fallido = (await json<RespuestaCorreos>(await llamar('/reep/correos?estado=fallido')))
      .items[0]
    if (!fallido) throw new Error('no failed mail in the seed')
    expect(
      (await llamar(`/reep/correos/${fallido.id}/reintentar`, { metodo: 'POST' })).status,
    ).toBe(200)
    const despues = await json<RespuestaCorreos>(await llamar('/reep/correos?porPagina=100'))
    expect(despues.items.find((c) => c.id === fallido.id)?.estado).toBe('enviado')

    const rebotado = (await json<RespuestaCorreos>(await llamar('/reep/correos?estado=rebotado')))
      .items[0]
    if (!rebotado) throw new Error('no bounced mail in the seed')
    expect(
      (await llamar(`/reep/correos/${rebotado.id}/reintentar`, { metodo: 'POST' })).status,
    ).toBe(409)
  })

  it('"corregir y reenviar" fixes the peer address and sends a new «Reenvío por corrección»', async () => {
    const rebotado = (await json<RespuestaCorreos>(await llamar('/reep/correos?estado=rebotado')))
      .items[0]
    if (!rebotado) throw new Error('no bounced mail in the seed')
    expect(
      (
        await llamar(`/reep/correos/${rebotado.id}/corregir`, {
          metodo: 'POST',
          cuerpo: { correo: 'no-es-correo' },
        })
      ).status,
    ).toBe(422)
    const r = await llamar(`/reep/correos/${rebotado.id}/corregir`, {
      metodo: 'POST',
      cuerpo: { correo: 'j.rosero@umariana.edu.co' },
    })
    expect(r.status).toBe(200)
    const lista = await json<RespuestaCorreos>(await llamar('/reep/correos?porPagina=100'))
    const original = lista.items.find((c) => c.id === rebotado.id)
    expect(original).toMatchObject({ estado: 'rebotado', atendido: true })
    expect(
      lista.items.some(
        (c) =>
          c.tipo === 'reenvio' &&
          c.estado === 'enviado' &&
          c.destinatario === 'j.rosero@umariana.edu.co',
      ),
    ).toBe(true)
    expect(lista.rebotados).toBe(0)
    // Ya atendido: no se puede corregir dos veces
    expect(
      (
        await llamar(`/reep/correos/${rebotado.id}/corregir`, {
          metodo: 'POST',
          cuerpo: { correo: 'otra@umariana.edu.co' },
        })
      ).status,
    ).toBe(409)
  })

  it('«Reintentar fallidos» sends again the mails the service failed', async () => {
    const r = await json<{ reintentados: number; enviados: number; siguenFallando: number }>(
      await llamar('/reep/correos/reintentar-fallidos', { metodo: 'POST' }),
    )
    expect(r.reintentados).toBeGreaterThan(0)
    expect(r.enviados + r.siguenFallando).toBe(r.reintentados)
    const lista = await json<RespuestaCorreos>(await llamar('/reep/correos?porPagina=100'))
    expect(lista.fallidos).toBe(0)
    expect(lista.enCola).toBe(0)
  })
})

describe('dashboards API (mock)', () => {
  it('the journal dashboard counts the two priority alerts of its own journal', async () => {
    const t = await json<Tablero>(await llamar('/reep/tablero'))
    const constancias = await json<RespuestaConstancias>(await llamar('/reep/constancias'))
    expect(t.constanciasPendientes).toHaveLength(constancias.pendientes.length)
    expect(t.sinResponder.length).toBeGreaterThan(0)
    expect(
      t.sinResponder.every((c) => c.estado === 'invitado' || c.estado === 'segundo-intento'),
    ).toBe(true)
    const ire = await json<Tablero>(await llamar('/ire/tablero'))
    expect(
      ire.sinResponder.some((c) => t.sinResponder.some((x) => x.asignacionId === c.asignacionId)),
    ).toBe(false)
  })

  it('the home summary shows both journals side by side', async () => {
    const r = await json<ResumenGeneral>(await llamar('/resumen'))
    expect(r.revistas.map((x) => x.revista)).toEqual(['reep', 'ire'])
    expect(r.revistas.every((x) => x.articulos === 20 && x.pares === 30)).toBe(true)
    const reep = await json<Tablero>(await llamar('/reep/tablero'))
    expect(r.revistas[0]?.sinResponder).toBe(reep.sinResponder.length)
  })

  it('the article list can be narrowed to those with peers that have not answered', async () => {
    const t = await json<Tablero>(await llamar('/reep/tablero'))
    const lista = await json<RespuestaListado>(
      await llamar('/reep/articulos?sinResponder=1&porPagina=50'),
    )
    const esperados = new Set(t.sinResponder.map((c) => c.articuloId))
    expect(lista.total).toBe(esperados.size)
    expect(lista.items.every((a) => esperados.has(a.id))).toBe(true)
  })

  it('the report is consistent (total = journals) and filters by journal; Administradora only', async () => {
    const todas = await json<Informe>(await llamar('/informes?revista=ambas&periodo=2026-2'))
    expect(todas.postulados.total).toBe(todas.postulados.reep + todas.postulados.ire)
    expect(todas.postulados.total).toBeGreaterThan(0)
    const soloReep = await json<Informe>(await llamar('/informes?revista=reep&periodo=2026-2'))
    expect(soloReep.postulados.ire).toBe(0)
    expect(soloReep.postulados.total).toBe(todas.postulados.reep)
    // Artículos aprobados y rechazados, cada revista en su propia columna
    expect(todas.rechazados.total).toBe(todas.rechazados.reep + todas.rechazados.ire)
    const c = todas.conceptos
    expect(c.publicable + c.conModificaciones + c.noPublicable).toBeLessThanOrEqual(
      todas.evaluacionesEntregadas.total,
    )
    expect(
      (await llamar('/informes?revista=ambas&periodo=2026-2', { usuario: AUXILIAR })).status,
    ).toBe(200)
    expect((await llamar('/informes?revista=xx&periodo=2026-2')).status).toBe(422)
    expect((await llamar('/informes?revista=ambas&periodo=1999-1')).status).toBe(422)
    const periodos = await json<Array<{ valor: string; etiqueta: string }>>(
      await llamar('/informes/periodos'),
    )
    expect(periodos[0]?.etiqueta).toMatch(/semestre de 2026/)
  })
})

describe('administration API (mock)', () => {
  it('user management is Administradora-only; accounts validate domain and uniqueness', async () => {
    expect((await llamar('/usuarios', { usuario: AUXILIAR })).status).toBe(403)
    const datos = {
      nombre: 'Laura Peña',
      correo: 'laura.pena@unicesmag.edu.co',
      perfil: 'auxiliar',
    }
    expect(
      (
        await llamar('/usuarios', {
          metodo: 'POST',
          cuerpo: { ...datos, correo: 'laura@gmail.com' },
        })
      ).status,
    ).toBe(422)
    const ok = await llamar('/usuarios', { metodo: 'POST', cuerpo: datos })
    expect(ok.status).toBe(201)
    expect((await json<Usuario>(ok)).estado).toBe('activo')
    expect((await llamar('/usuarios', { metodo: 'POST', cuerpo: datos })).status).toBe(409)
    expect((await json<Usuario[]>(await llamar('/usuarios'))).length).toBe(4)
  })

  it('a disabled account cannot log in, and the last Administradora cannot be disabled', async () => {
    expect(
      (await llamar('/usuarios/u-1', { metodo: 'PATCH', cuerpo: { estado: 'inhabilitado' } }))
        .status,
    ).toBe(409)
    expect(
      (await llamar('/usuarios/u-1', { metodo: 'PATCH', cuerpo: { perfil: 'auxiliar' } })).status,
    ).toBe(409)
    expect(
      (await llamar('/usuarios/u-2', { metodo: 'PATCH', cuerpo: { estado: 'inhabilitado' } }))
        .status,
    ).toBe(200)
    const login = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        correo: 'andrea.villota@unicesmag.edu.co',
        contrasena: 'Editorial2026*',
      }),
    })
    expect(login.status).toBe(403)
  })

  it('the audit log merges both journals and filters by journal, type and user', async () => {
    const todas = await json<{
      items: Array<{ revista: string; tipo: string; usuario: string }>
      total: number
    }>(await llamar('/auditoria?porPagina=500'))
    expect(new Set(todas.items.map((e) => e.revista))).toEqual(new Set(['reep', 'ire']))
    const ire = await json<{ items: Array<{ revista: string }>; total: number }>(
      await llamar('/auditoria?revista=ire&porPagina=500'),
    )
    expect(ire.items.every((e) => e.revista === 'ire')).toBe(true)
    const constancia = await json<{ items: Array<{ tipo: string }> }>(
      await llamar('/auditoria?tipo=constancia&porPagina=500'),
    )
    expect(constancia.items.length).toBeGreaterThan(0)
    expect(constancia.items.every((e) => e.tipo === 'constancia')).toBe(true)
    const porUsuario = await json<{ items: Array<{ usuario: string }> }>(
      await llamar('/auditoria?usuario=villota&porPagina=500'),
    )
    expect(porUsuario.items.every((e) => e.usuario === 'Andrea Villota')).toBe(true)
    expect((await llamar('/auditoria', { usuario: AUXILIAR })).status).toBe(403)
  })
})
