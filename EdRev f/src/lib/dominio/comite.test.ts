import { puedeAsignarPares, puedeRegistrarRonda, requiereNuevaRevision } from './comite'
import type { EstadoArticulo, RondaComite } from '@/types/articulo'

const ronda = (resultado: RondaComite['resultado']) => ({ resultado }) as RondaComite
const articulo = (estado: EstadoArticulo, ...rondas: RondaComite[]) => ({
  estado,
  rondasComite: rondas,
})

describe('committee review and assignment of peers', () => {
  it('peers are assigned only when the last round approved and the article is under review', () => {
    expect(puedeAsignarPares(articulo('en-revision', ronda('ajustes'), ronda('aprobado')))).toBe(
      true,
    )
    expect(puedeAsignarPares(articulo('en-evaluacion', ronda('aprobado')))).toBe(true)
    expect(puedeAsignarPares(articulo('en-revision', ronda('aprobado'), ronda('ajustes')))).toBe(
      false,
    )
    for (const estado of ['postulado', 'aprobado', 'rechazado', 'archivado'] as const) {
      expect(puedeAsignarPares(articulo(estado, ronda('aprobado')))).toBe(false)
    }
  })

  it('an article taken up again as «Postulado» must be reviewed anew, even though it had peers', () => {
    const retomado = articulo('postulado', ronda('ajustes'), ronda('aprobado'))
    expect(requiereNuevaRevision(retomado)).toBe(true)
    expect(puedeRegistrarRonda(retomado, true)).toBe(true)
    expect(requiereNuevaRevision(articulo('postulado'))).toBe(false)
    expect(requiereNuevaRevision(articulo('en-revision', ronda('aprobado')))).toBe(false)
    expect(puedeRegistrarRonda(articulo('en-revision', ronda('ajustes')), true)).toBe(false)
  })
})
