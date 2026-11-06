/*
 * RutaPorPermiso — authorization guard: renders the nested routes only if the user's profile
 * allows the action; otherwise shows a restricted-access message. Covers: RNF-05, HU-29.
 */
import { Outlet } from 'react-router-dom'
import { usePermiso } from '../hooks/usePermiso'
import type { Accion } from '../config/permisos'
import { Alerta } from '@/components/common/Alerta'

export interface RutaPorPermisoProps {
  accion: Accion
}

export function RutaPorPermiso({ accion }: RutaPorPermisoProps) {
  const permitido = usePermiso(accion)
  if (permitido) return <Outlet />
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-titulo-24">Acceso restringido</h1>
      <Alerta tipo="advertencia">
        Su perfil no tiene permiso para esta sección. Consulte con la Administradora.
      </Alerta>
    </section>
  )
}
