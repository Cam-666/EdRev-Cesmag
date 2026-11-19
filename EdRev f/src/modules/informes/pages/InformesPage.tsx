/*
 * InformesPage — Informe de gestión (/informes): management report of a period (semester) for one
 * journal or both, laid out as a document: heading, executive summary, key figures, charts, the
 * comparative table and the notes on how each figure is counted. It can be saved as a PDF (a
 * document built by the server, with a section and charts per journal, not a capture of this
 * screen) or exported as CSV. The report is shown as soon as the
 * journal or the period changes. It is a cross-journal screen: in "Ambas" each journal keeps its
 * own column and color. Open to both profiles.
 * Covers: RF-38, HU-27.
 */
import { format } from 'date-fns'
import { useState } from 'react'
import { ComparativoRevistas } from '../components/ComparativoRevistas'
import { ConceptosDelPeriodo } from '../components/ConceptosDelPeriodo'
import { GraficaActividad } from '../components/GraficaActividad'
import { NotasDelInforme } from '../components/NotasDelInforme'
import { SeccionInforme } from '../components/SeccionInforme'
import { useDescargarInformePdf, useInforme, usePeriodos } from '../hooks/useInformes'
import { csvInforme, nombreArchivoInforme } from '../services/exportar'
import { redactarResumen } from '../services/redaccion'
import { Boton } from '@/components/common/Boton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { TarjetaMetrica } from '@/components/common/TarjetaMetrica'
import { descargarTexto } from '@/lib/descarga'
import { formatearFechaLarga } from '@/lib/format'
import type { FiltroRevistaInforme } from '@/types/panel'
import { REVISTAS } from '@/types/revista'

const REVISTAS_FILTRO = [
  { valor: 'ambas', etiqueta: 'Ambas' },
  { valor: 'reep', etiqueta: 'Educación y Pedagogía' },
  { valor: 'ire', etiqueta: 'Investigium IRE' },
]

function alcance(revista: FiltroRevistaInforme): string {
  return revista === 'ambas'
    ? `${REVISTAS.reep.nombre} · ${REVISTAS.ire.nombre}`
    : REVISTAS[revista].nombre
}

export function InformesPage() {
  const periodos = usePeriodos()
  const [revista, setRevista] = useState<FiltroRevistaInforme>('ambas')
  const [periodo, setPeriodo] = useState<string | null>(null)

  const elegido = periodo ?? periodos.data?.[0]?.valor ?? null
  const informe = useInforme(revista, elegido)
  const descargarPdf = useDescargarInformePdf()
  const datos = informe.data

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-2 [print-color-adjust:exact] print:max-w-none print:gap-14 print:py-0">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="hidden text-micro-11 uppercase tracking-wide text-texto-secundario print:block">
            Universidad CESMAG · Dependencia de Editorial
          </p>
          <span aria-hidden="true" className="h-1 w-16 rounded-full bg-texto-enlace" />
        </div>
        <EncabezadoPagina
          titulo="Informe de gestión"
          acciones={
            datos && (
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <Boton
                  variante="neutro"
                  tamano="sm"
                  cargando={descargarPdf.isPending}
                  onClick={() => elegido && descargarPdf.mutate({ revista, periodo: elegido })}
                >
                  Guardar como PDF
                </Boton>
                <Boton
                  variante="neutro"
                  tamano="sm"
                  onClick={() =>
                    descargarTexto(nombreArchivoInforme(datos), csvInforme(datos), 'text/csv')
                  }
                >
                  Exportar
                </Boton>
              </div>
            )
          }
        >
          {datos && (
            <div className="mt-1 flex flex-col gap-0.5 text-cuerpo-13 text-texto-secundario">
              <p>{alcance(datos.revista)}</p>
              <p role="status">
                {datos.etiquetaPeriodo} · Elaborado el{' '}
                {formatearFechaLarga(format(new Date(), 'yyyy-MM-dd'))}
              </p>
            </div>
          )}
        </EncabezadoPagina>
      </div>

      <form
        className="grid grid-cols-1 gap-4 md:max-w-2xl md:grid-cols-2 print:hidden"
        aria-label="Filtros del informe"
      >
        <ListaDesplegable
          etiqueta="Revista"
          opciones={REVISTAS_FILTRO}
          valor={revista}
          onCambio={(v) => setRevista(v as FiltroRevistaInforme)}
        />
        <ListaDesplegable
          etiqueta="Periodo"
          opciones={periodos.data ?? []}
          valor={elegido ?? undefined}
          onCambio={setPeriodo}
        />
      </form>

      <EstadoConsulta
        cargando={informe.isPending && elegido !== null}
        error={informe.isError}
        onReintentar={() => void informe.refetch()}
        descripcion="el informe"
      >
        {datos && (
          <>
            <SeccionInforme numero={1} titulo="Resumen ejecutivo">
              <div className="flex flex-col gap-3 rounded-lg border-l-4 border-texto-enlace bg-superficie-sutil px-6 py-5 text-cuerpo-15 text-texto-principal print:gap-5 print:px-8 print:py-8 print:text-[17px] print:leading-8">
                {redactarResumen(datos).map((parrafo) => (
                  <p key={parrafo}>{parrafo}</p>
                ))}
              </div>
            </SeccionInforme>

            <SeccionInforme numero={2} titulo="Indicadores principales">
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-6 print:grid-cols-3 print:gap-6">
                <TarjetaMetrica valor={datos.postulados.total} etiqueta="Artículos postulados" />
                <TarjetaMetrica valor={datos.aprobados.total} etiqueta="Aprobados" />
                <TarjetaMetrica valor={datos.rechazados.total} etiqueta="Rechazados" />
                <TarjetaMetrica
                  valor={datos.evaluacionesEntregadas.total}
                  etiqueta="Evaluaciones entregadas"
                />
                <TarjetaMetrica
                  valor={datos.constanciasEmitidas.total}
                  etiqueta="Constancias emitidas"
                />
                <TarjetaMetrica
                  valor={datos.diasPromedioEvaluacion.total}
                  etiqueta="Días promedio por evaluación"
                />
              </div>
            </SeccionInforme>

            <SeccionInforme numero={3} titulo="Actividad editorial y evaluación por pares" nuevaPagina>
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px] print:grid-cols-1">
                <GraficaActividad informe={datos} />
                <ConceptosDelPeriodo conceptos={datos.conceptos} />
              </div>
            </SeccionInforme>

            <SeccionInforme numero={4} titulo="Comparativo por revista" nuevaPagina>
              <div className="break-inside-avoid print:text-[15px] print:[&_td]:py-5 print:[&_th]:py-4">
                <ComparativoRevistas informe={datos} />
              </div>
            </SeccionInforme>

            <SeccionInforme numero={5} titulo="Notas sobre los datos">
              <NotasDelInforme />
            </SeccionInforme>

            <p className="border-t border-borde-base pt-4 text-micro-11 text-texto-secundario">
              Informe generado por el Sistema de Gestión Editorial de la Universidad CESMAG.
            </p>
          </>
        )}
      </EstadoConsulta>
    </section>
  )
}
