/*
 * InicioGeneralPage — Inicio (/inicio): summary of both journals and what is pending in each.
 * It is one of the few cross-journal screens (with Informes and Auditoría): it shows both
 * journals side by side, never mixed. Each card is white with a band in its journal's own gradient
 * (data-revista) and its figures in soft neutral blocks, so both cards weigh the same and the colour
 * only marks which journal is which. Every case opens inside its own journal.
 * Covers: RF-37, HU-25.
 */
import { useResumen } from '../hooks/usePanel'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { REVISTAS } from '@/types/revista'
import type { ResumenRevista } from '@/types/panel'
import type { Revista } from '@/types/revista'

interface CasoPendiente {
  clave: string
  revista: Revista
  situacion: string
  casos: number
  destino: string
}

function casosPendientes(resumen: ResumenRevista[]): CasoPendiente[] {
  return resumen.flatMap((r) => [
    {
      clave: `${r.revista}-pares`,
      revista: r.revista,
      situacion: 'Pares que no han respondido la invitación',
      casos: r.sinResponder,
      destino: `/${r.revista}/articulos?sinResponder=1`,
    },
    {
      clave: `${r.revista}-constancias`,
      revista: r.revista,
      situacion: 'Evaluaciones entregadas sin constancia',
      casos: r.constanciasPendientes,
      destino: `/${r.revista}/constancias`,
    },
    {
      clave: `${r.revista}-migrados`,
      revista: r.revista,
      situacion: 'Registros migrados por corregir',
      casos: r.porCorregir,
      destino: `/${r.revista}/por-corregir`,
    },
  ])
}

export function InicioGeneralPage() {
  const consulta = useResumen()
  const resumen = consulta.data

  const columnas: Array<ColumnaTabla<CasoPendiente>> = [
    { clave: 'revista', encabezado: 'Revista', render: (c) => REVISTAS[c.revista].nombreCorto },
    { clave: 'situacion', encabezado: 'Situación', render: (c) => c.situacion },
    { clave: 'casos', encabezado: 'Casos', render: (c) => c.casos },
    {
      clave: 'ver',
      encabezado: 'Ver',
      render: (c) => (
        <EnlaceBoton variante="texto" tamano="sm" to={c.destino}>
          Ver{' '}
          <span className="sr-only">
            {c.casos} casos de {REVISTAS[c.revista].nombreCorto}: {c.situacion}
          </span>
        </EnlaceBoton>
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-titulo-24">Inicio</h1>
      </header>

      <EstadoConsulta
        cargando={consulta.isPending}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="el resumen"
      >
        {resumen && (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {resumen.revistas.map((r) => (
                <section
                  key={r.revista}
                  data-revista={r.revista}
                  aria-labelledby={`titulo-modulo-${r.revista}`}
                  className="flex flex-col overflow-hidden rounded-lg border border-borde-base bg-superficie-tarjeta shadow-tarjeta"
                >
                  <div
                    aria-hidden="true"
                    className="h-2 bg-[image:var(--revista-barra)]"
                  />
                  <div className="flex flex-col gap-5 p-5">
                    <h2
                      id={`titulo-modulo-${r.revista}`}
                      className="text-titulo-20 text-revista-profundo"
                    >
                      {REVISTAS[r.revista].nombreCorto}
                    </h2>
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ['Artículos', r.articulos],
                        ['Pares', r.pares],
                        ['Sin responder', r.sinResponder],
                        ['Constancias', r.constanciasPendientes],
                      ].map(([etiqueta, valor]) => (
                        <div key={etiqueta} className="rounded-md bg-superficie-sutil px-3 py-2">
                          <dt className="text-cuerpo-13 text-texto-secundario">{etiqueta}</dt>
                          <dd className="text-titulo-24 text-revista-profundo">{valor}</dd>
                        </div>
                      ))}
                    </dl>
                    <div>
                      <EnlaceBoton variante="secundario" tamano="sm" to={`/${r.revista}/tablero`}>
                        Abrir revista{' '}
                        <span className="sr-only">{REVISTAS[r.revista].nombreCorto}</span>
                      </EnlaceBoton>
                    </div>
                  </div>
                </section>
              ))}
            </div>

            <section aria-labelledby="titulo-pendiente" className="flex flex-col gap-3">
              <h2 id="titulo-pendiente" className="text-titulo-16">
                Pendiente
              </h2>
              <Tabla
                etiqueta="Situaciones pendientes en ambas revistas"
                columnas={columnas}
                filas={casosPendientes(resumen.revistas)}
                obtenerClave={(c) => c.clave}
              />
            </section>
          </>
        )}
      </EstadoConsulta>
    </section>
  )
}
