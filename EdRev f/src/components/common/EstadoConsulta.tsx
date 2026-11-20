/*
 * EstadoConsulta — muestra el estado de carga, de error (con reintento) o el contenido de una consulta al
 * servidor, para que todas las pantallas manejen los tres estados igual.
 */
import type { ReactNode } from 'react'
import { Alerta } from './Alerta'
import { Boton } from './Boton'

export interface EstadoConsultaProps {
  cargando: boolean
  error: boolean
  onReintentar: () => void
  /** Qué se está cargando, para los mensajes («el artículo», «el listado»). */
  descripcion: string
  children: ReactNode
}

export function EstadoConsulta({
  cargando,
  error,
  onReintentar,
  descripcion,
  children,
}: EstadoConsultaProps) {
  if (cargando) {
    return (
      <div role="status" className="flex flex-col gap-2">
        <span className="sr-only">Cargando {descripcion}…</span>
        <span className="h-4 w-1/3 animate-pulse rounded-sm bg-neutro-200" />
        <span className="h-4 w-2/3 animate-pulse rounded-sm bg-neutro-200" />
        <span className="h-4 w-1/2 animate-pulse rounded-sm bg-neutro-200" />
      </div>
    )
  }
  if (error) {
    return (
      <Alerta
        tipo="error"
        accion={
          <Boton variante="secundario" tamano="sm" onClick={onReintentar}>
            Reintentar
          </Boton>
        }
      >
        No fue posible cargar {descripcion}. Revise su conexión e intente de nuevo.
      </Alerta>
    )
  }
  return <>{children}</>
}
