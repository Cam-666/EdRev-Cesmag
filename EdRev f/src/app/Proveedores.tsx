/* Proveedores — proveedores globales: la caché de datos del servidor (TanStack Query) y la sesión. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { SesionProvider } from '@/modules/acceso/components/SesionProvider'
import { ErrorApi } from '@/lib/api/cliente'
import type { Usuario } from '@/types/usuario'

export interface ProveedoresProps {
  /** Si se omite, la sesión se restaura del almacenamiento; si se pasa null o un usuario, se fuerza (pruebas, demostraciones). */
  usuarioInicial?: Usuario | null
  children: ReactNode
}

/** Reintenta una vez ante fallas de red o del servidor, nunca ante respuestas 4xx (un 404 no se arregla solo). */
function reintentar(intentos: number, error: unknown): boolean {
  if (error instanceof ErrorApi && error.estado >= 400 && error.estado < 500) return false
  return intentos < 1
}

export function Proveedores({ usuarioInicial, children }: ProveedoresProps) {
  const [cliente] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { retry: reintentar, staleTime: 30_000 } } }),
  )
  return (
    <QueryClientProvider client={cliente}>
      <SesionProvider usuarioInicial={usuarioInicial}>{children}</SesionProvider>
    </QueryClientProvider>
  )
}
