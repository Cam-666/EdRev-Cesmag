/*
 * TablaConstancias — las dos listas de la pantalla de constancias.
 * pendientes: evaluaciones entregadas que aún no tienen constancia (par, artículo, fecha de entrega y origen
 *             «Migrado» / «Sistema»), cada una con un botón «Emitir» que abre su vista previa.
 * emitidas:   las ya emitidas con «Descargar» y, para la Administradora, «Reenviar».
 */
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { Boton } from '@/components/common/Boton'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { formatearFecha } from '@/lib/format'
import type { FilaConstancia } from '@/types/constancia'

const ARTICULO: ColumnaTabla<FilaConstancia> = {
  clave: 'articulo',
  encabezado: 'Artículo',
  render: (f) => f.articulo.numeroOjs,
  className: 'whitespace-nowrap',
}

const PAR: ColumnaTabla<FilaConstancia> = {
  clave: 'par',
  encabezado: 'Par',
  render: (f) => f.par.nombre,
}

export interface TablaPendientesProps {
  filas: FilaConstancia[]
  cargando: boolean
  /** Constancia cuya vista previa está abierta. */
  seleccionada: string | null
  onElegir: (fila: FilaConstancia) => void
  /** Si el usuario puede emitir. */
  puedeEmitir: boolean
}

export function TablaPendientes({
  filas,
  cargando,
  seleccionada,
  onElegir,
  puedeEmitir,
}: TablaPendientesProps) {
  const columnas: Array<ColumnaTabla<FilaConstancia>> = [
    PAR,
    ARTICULO,
    {
      clave: 'entrego',
      encabezado: 'Entregó',
      render: (f) => formatearFecha(f.fechaEntrega),
      className: 'whitespace-nowrap',
    },
    {
      clave: 'origen',
      encabezado: 'Origen',
      render: (f) => (f.origen === 'migrado' ? 'Migrado' : 'Sistema'),
    },
  ]
  if (puedeEmitir) {
    columnas.push({
      clave: 'accion',
      encabezado: 'Emitir',
      render: (f) => (
        <Boton
          variante={f.id === seleccionada ? 'primario' : 'secundario'}
          tamano="sm"
          aria-pressed={f.id === seleccionada}
          onClick={() => onElegir(f)}
        >
          Emitir <span className="sr-only">la constancia de {f.par.nombre}</span>
        </Boton>
      ),
    })
  }
  return (
    <Tabla
      etiqueta="Constancias pendientes de emisión"
      columnas={columnas}
      filas={filas}
      obtenerClave={(f) => f.id}
      cargando={cargando}
      vacio="No hay constancias pendientes: todas las evaluaciones entregadas ya cuentan con su constancia."
    />
  )
}

export interface TablaEmitidasProps {
  filas: FilaConstancia[]
  cargando: boolean
  onDescargar: (fila: FilaConstancia) => void
  /** Reenviar es solo de la Administradora; null oculta el botón. */
  onReenviar: ((fila: FilaConstancia) => void) | null
}

export function TablaEmitidas({ filas, cargando, onDescargar, onReenviar }: TablaEmitidasProps) {
  const columnas: Array<ColumnaTabla<FilaConstancia>> = [
    PAR,
    ARTICULO,
    {
      clave: 'emitida',
      encabezado: 'Emitida',
      render: (f) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          {f.fechaEmision && formatearFecha(f.fechaEmision)}
          <DistintivoEstado estado="emitida" />
        </span>
      ),
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      render: (f) => (
        <span className="flex gap-2">
          <Boton variante="texto" tamano="sm" onClick={() => onDescargar(f)}>
            Descargar <span className="sr-only">la constancia de {f.par.nombre}</span>
          </Boton>
          {onReenviar && (
            <Boton variante="texto" tamano="sm" onClick={() => onReenviar(f)}>
              Reenviar <span className="sr-only">la constancia de {f.par.nombre}</span>
            </Boton>
          )}
        </span>
      ),
    },
  ]
  return (
    <Tabla
      etiqueta="Constancias emitidas"
      columnas={columnas}
      filas={filas}
      obtenerClave={(f) => f.id}
      cargando={cargando}
      vacio="Aún no se ha emitido ninguna constancia en esta revista."
    />
  )
}
