/*
 * RutaPorPermiso — authorization guard: renders the nested routes only if the user's profile
 * allows the action; otherwise shows a restricted-access message. Covers: RNF-05, HU-29.
 */
import { Outlet, useOutletContext } from 'react-router-dom'
import { usePermiso } from '../hooks/usePermiso'
import type { Accion } from '../config/permisos'
import { Alerta } from '@/components/common/Alerta'

export interface RutaPorPermisoProps {
  accion: Accion
  /** Use h2 when the route renders inside a screen that already has its own h1. */
  encabezado?: 'h1' | 'h2'
}

export function RutaPorPermiso({ accion, encabezado = 'h1' }: RutaPorPermisoProps) {
  const Titulo = encabezado
  const permitido = usePermiso(accion)
  // Forward the parent's outlet context (e.g. the article of the sheet) to the guarded routes.
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
