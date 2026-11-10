/*
 * InformesPage — Informe de gestión (/informes): management report of a period (semester) for one
 * journal or both, exportable. It is a cross-journal screen: in "Las dos" each journal keeps its own
 * column. Optional scope (RF-38 is "Deseable"). Administradora only (RNF-05).
 * Covers: RF-38, HU-27.
 */
import { useState } from 'react'
import { ComparativoRevistas } from '../components/ComparativoRevistas'
import { ConceptosDelPeriodo } from '../components/ConceptosDelPeriodo'
import { useInforme, usePeriodos } from '../hooks/useInformes'
import { csvInforme, nombreArchivoInforme } from '../services/exportar'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { TarjetaMetrica } from '@/components/common/TarjetaMetrica'
import { descargarTexto } from '@/lib/descarga'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import type { FiltroRevistaInforme } from '@/types/panel'

const REVISTAS_FILTRO = [
  { valor: 'ambas', etiqueta: 'Las dos' },
  { valor: 'reep', etiqueta: 'Educación y Pedagogía' },
  { valor: 'ire', etiqueta: 'Investigium IRE' },
]

export function InformesPage() {
  const periodos = usePeriodos()
  const [revista, setRevista] = useState<FiltroRevistaInforme>('ambas')
  const [periodo, setPeriodo] = useState<string | null>(null)
  const [aplicado, setAplicado] = useState<{
    revista: FiltroRevistaInforme
    periodo: string
  } | null>(null)

  const elegido = periodo ?? periodos.data?.[0]?.valor ?? null
  const informe = useInforme(aplicado?.revista ?? revista, aplicado?.periodo ?? elegido)
  const datos = informe.data

  return (
    <section className="flex flex-col gap-6">
      {datos && (
        <AccionesEncabezado>
          <Boton
            variante="neutro"
            tamano="sm"
            onClick={() =>
              descargarTexto(nombreArchivoInforme(datos), csvInforme(datos), 'text/csv')
            }
          >
            Exportar
          </Boton>
        </AccionesEncabezado>
      )}
      <header>
        <h1 className="text-titulo-24">Informe de gestión</h1>
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {datos ? datos.etiquetaPeriodo : ' '}
        </p>
      </header>

      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          if (elegido) setAplicado({ revista, periodo: elegido })
        }}
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
        <CampoTexto etiqueta="Formato" value=".csv (se abre en Excel)" readOnly disabled />
        <Boton type="submit">Generar</Boton>
      </form>

      <EstadoConsulta
        cargando={informe.isPending && elegido !== null}
        error={informe.isError}
        onReintentar={() => void informe.refetch()}
        descripcion="el informe"
      >
        {datos && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TarjetaMetrica valor={datos.postulados.total} etiqueta="Artículos postulados" />
              <TarjetaMetrica valor={datos.aprobados.total} etiqueta="Aprobados" />
              <TarjetaMetrica
                valor={datos.evaluacionesEntregadas.total}
                etiqueta="Evaluaciones entregadas"
              />
              <TarjetaMetrica
                valor={datos.constanciasEmitidas.total}
                etiqueta="Constancias emitidas"
              />
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
              <section aria-labelledby="titulo-comparativo" className="flex flex-col gap-3">
                <h2 id="titulo-comparativo" className="text-titulo-16">
                  Comparativo por revista
                </h2>
                <ComparativoRevistas informe={datos} />
              </section>
              <ConceptosDelPeriodo conceptos={datos.conceptos} />
            </div>
          </>
        )}
      </EstadoConsulta>
    </section>
  )
}
