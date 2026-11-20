/*
 * RutaPorPermiso — guardia de autorización: dibuja las rutas anidadas solo si el perfil del usuario permite la
 * acción; si no, muestra un mensaje de acceso restringido.
 */
import { Outlet, useOutletContext } from 'react-router-dom'
import { usePermiso } from '../hooks/usePermiso'
import type { Accion } from '../config/permisos'
import { Alerta } from '@/components/common/Alerta'

export interface RutaPorPermisoProps {
  accion: Accion
  /** Usar h2 cuando la ruta se dibuja dentro de una pantalla que ya tiene su propio h1. */
  encabezado?: 'h1' | 'h2'
}

export function RutaPorPermiso({ accion, encabezado = 'h1' }: RutaPorPermisoProps) {
  const Titulo = encabezado
  const permitido = usePermiso(accion)
  // Pasa el contexto del outlet del padre (por ejemplo el artículo de la ficha) a las rutas protegidas.
  const contexto = useOutletContext<unknown>()
  if (permitido) return <Outlet context={contexto} />
  return (
    <section className="flex flex-col gap-4">
      <Titulo className="text-titulo-24">Acceso restringido</Titulo>
      <Alerta tipo="advertencia">
        Su perfil no tiene permiso para esta sección. Consulte con la Administradora.
      </Alerta>
    </section>
  )
}
