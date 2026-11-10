/*
 * AuditoriaPage — Registro de auditoría (/administracion/auditoria): who did what and when across
 * the two journals — state changes, edits, sent mails and issued constancias — filterable by
 * journal, user and type, and exportable. It is a cross-journal screen: every row names its journal.
 * Administradora only. Covers: RF-41, HU-30.
 */
import { useState } from 'react'
import { ETIQUETA_TIPO_AUDITORIA } from '../config/perfiles'
import { useAuditoria } from '../hooks/useAdmin'
import type { EntradaAuditoriaGlobal, FiltrosAuditoria } from '../services/adminService'
import { Boton } from '@/components/common/Boton'
import { Buscador } from '@/components/common/Buscador'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Paginacion } from '@/components/common/Paginacion'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { csv, descargarTexto } from '@/lib/descarga'
import { abreviarNombre, formatearFechaHora } from '@/lib/format'
import { useRetardo } from '@/lib/useRetardo'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import type { TipoAuditoria } from '@/types/historial'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

const TODAS = 'todas'
const POR_PAGINA = 10

export function AuditoriaPage() {
  const [revista, setRevista] = useState<Revista | undefined>()
  const [tipo, setTipo] = useState<TipoAuditoria | undefined>()
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState(1)
  const usuario = useRetardo(texto.trim(), 300)

  const filtros: FiltrosAuditoria = {
    revista,
    tipo,
    usuario: usuario || undefined,
    pagina,
    porPagina: POR_PAGINA,
  }
  const consulta = useAuditoria(filtros)
  const datos = consulta.data

  const columnas: Array<ColumnaTabla<EntradaAuditoriaGlobal>> = [
    {
      clave: 'fecha',
      encabezado: 'Fecha',
      render: (e) => formatearFechaHora(e.fecha),
      className: 'whitespace-nowrap',
    },
    {
      clave: 'usuario',
      encabezado: 'Usuario',
      render: (e) => (e.usuario === 'Sistema' ? 'Sistema' : abreviarNombre(e.usuario)),
      className: 'whitespace-nowrap',
    },
    { clave: 'revista', encabezado: 'Revista', render: (e) => REVISTAS[e.revista].nombreCorto },
    { clave: 'accion', encabezado: 'Acción', render: (e) => e.accion },
  ]

  function exportar() {
    if (!datos) return
    const filas = [
      ['Fecha', 'Usuario', 'Revista', 'Tipo', 'Acción'],
      ...datos.items.map((e) => [
        e.fecha,
        e.usuario,
        REVISTAS[e.revista].nombreCorto,
        ETIQUETA_TIPO_AUDITORIA[e.tipo],
        e.accion,
      ]),
    ]
    descargarTexto('auditoria.csv', csv(filas), 'text/csv')
  }

  return (
    <section className="flex flex-col gap-4">
      <AccionesEncabezado>
        <Boton variante="neutro" tamano="sm" onClick={exportar} disabled={!datos}>
          Exportar
        </Boton>
      </AccionesEncabezado>
      <div>
        <h2 className="text-titulo-16">Registro de auditoría</h2>
        <p role="status" className="text-cuerpo-13 text-texto-secundario">
          {datos ? `${datos.total} acciones registradas en las dos revistas` : ' '}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ListaDesplegable
          etiqueta="Revista"
          valor={revista ?? TODAS}
          onCambio={(v) => {
            setRevista(v === TODAS ? undefined : (v as Revista))
            setPagina(1)
          }}
          opciones={[
            { valor: TODAS, etiqueta: 'Las dos' },
            { valor: 'reep', etiqueta: REVISTAS.reep.nombreCorto },
            { valor: 'ire', etiqueta: REVISTAS.ire.nombreCorto },
          ]}
        />
        <ListaDesplegable
          etiqueta="Tipo de acción"
          valor={tipo ?? TODAS}
          onCambio={(v) => {
            setTipo(v === TODAS ? undefined : (v as TipoAuditoria))
            setPagina(1)
          }}
          opciones={[
            { valor: TODAS, etiqueta: 'Todas' },
            ...(Object.keys(ETIQUETA_TIPO_AUDITORIA) as TipoAuditoria[]).map((t) => ({
              valor: t,
              etiqueta: ETIQUETA_TIPO_AUDITORIA[t],
            })),
          ]}
        />
        <Buscador
          className="xl:self-end"
          etiqueta="Buscar por usuario"
          placeholder="Buscar por usuario"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            setPagina(1)
          }}
        />
      </div>

      <EstadoConsulta
        cargando={false}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="el registro de auditoría"
      >
        <Tabla
          etiqueta="Registro de auditoría de las dos revistas"
          columnas={columnas}
          filas={datos?.items ?? []}
          obtenerClave={(e) => `${e.revista}-${e.id}`}
          cargando={consulta.isPending}
          vacio="Ninguna acción coincide con los filtros."
        />
        {datos && datos.total > 0 && (
          <Paginacion
            pagina={pagina}
            porPagina={POR_PAGINA}
            total={datos.total}
            onCambiar={setPagina}
          />
        )}
      </EstadoConsulta>
    </section>
  )
}
