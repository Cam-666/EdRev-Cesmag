import { render, screen } from '@testing-library/react'
import { DEFINICIONES_ESTADO, DistintivoEstado } from './DistintivoEstado'
import type { EstadoDistintivo } from './DistintivoEstado'

const OCHO_BASE: EstadoDistintivo[] = [
  'postulado',
  'en-revision',
  'en-evaluacion',
  'aprobado',
  'rechazado',
  'archivado',
  'bloqueado',
  'pendiente',
]

describe('DistintivoEstado', () => {
  it.each(OCHO_BASE)('%s shows text and a symbol (never color alone)', (estado) => {
    const { container } = render(<DistintivoEstado estado={estado} />)
    const def = DEFINICIONES_ESTADO[estado]
    expect(screen.getByText(def.texto, { exact: false })).toBeInTheDocument()
    const simbolo = container.querySelector('[aria-hidden="true"]')
    expect(simbolo?.textContent).toBe(def.simbolo)
    expect(def.simbolo.length).toBeGreaterThan(0)
  })
})
