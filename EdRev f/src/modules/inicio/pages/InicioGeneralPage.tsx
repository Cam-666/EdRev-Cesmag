/*
 * InicioGeneralPage — Inicio general (/inicio): summary of the two journals and what is stopped
 * in each. It is one of the few cross-journal screens (with Informes and Auditoría): it shows both
 * journals side by side, never mixed, and every case opens inside its own journal.
 * Covers: RF-37, HU-25.
 */
import { useResumen } from '../hooks/usePanel'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { formatearFechaLarga } from '@/lib/format'
import { REVISTAS } from '@/types/revista'
import type { ResumenRevista } from '@/types/panel'
import type { Revista } from '@/types/revista'

interface CasoDetenido {
  clave: string
  revista: Revista
  situacion: string
  casos: number
  destino: string
}

function casosDetenidos(resumen: ResumenRevista[]): CasoDetenido[] {
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
  ])
}

export function InicioGeneralPage() {
  const consulta = useResumen()
  const resumen = consulta.data

  const columnas: Array<ColumnaTabla<CasoDetenido>> = [
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
        <h1 className="text-titulo-24">Inicio general</h1>
        <p className="text-cuerpo-13 text-texto-secundario">
          {resumen
            ? `Resumen de las dos revistas al ${formatearFechaLarga(resumen.fecha)}`
            : 'Resumen de las dos revistas'}
        </p>
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
                  aria-labelledby={`titulo-modulo-${r.revista}`}
                  className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
                >
                  <div>
                    <p className="text-micro-11 uppercase text-texto-secundario">
                      Módulo {REVISTAS[r.revista].modulo}
                    </p>
                    <h2 id={`titulo-modulo-${r.revista}`} className="text-titulo-20">
                      {REVISTAS[r.revista].nombreCorto}
                    </h2>
                  </div>
                  <dl className="grid grid-cols-4 gap-4">
                    <div>
                      <dt className="text-cuerpo-13 text-texto-secundario">Artículos</dt>
                      <dd className="text-titulo-24">{r.articulos}</dd>
                    </div>
                    <div>
                      <dt className="text-cuerpo-13 text-texto-secundario">Pares</dt>
                      <dd className="text-titulo-24">{r.pares}</dd>
                    </div>
                    <div>
                      <dt className="text-cuerpo-13 text-texto-secundario">Sin responder</dt>
                      <dd className="text-titulo-24">{r.sinResponder}</dd>
                    </div>
                    <div>
                      <dt className="text-cuerpo-13 text-texto-secundario">Constancias</dt>
                      <dd className="text-titulo-24">{r.constanciasPendientes}</dd>
                    </div>
                  </dl>
                  <div>
                    <EnlaceBoton variante="secundario" tamano="sm" to={`/${r.revista}/tablero`}>
                      Abrir el módulo{' '}
                      <span className="sr-only">{REVISTAS[r.revista].nombreCorto}</span>
                    </EnlaceBoton>
                  </div>
                </section>
              ))}
            </div>

            <section aria-labelledby="titulo-detenido" className="flex flex-col gap-3">
              <h2 id="titulo-detenido" className="text-titulo-16">
                Lo que está detenido en las dos revistas
              </h2>
              <Tabla
                etiqueta="Situaciones detenidas en las dos revistas"
                columnas={columnas}
                filas={casosDetenidos(resumen.revistas)}
                obtenerClave={(c) => c.clave}
              />
            </section>
          </>
        )}
      </EstadoConsulta>
    </section>
  )
}
