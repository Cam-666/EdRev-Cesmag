/*
 * Proveedores — global providers: server-state cache (TanStack Query) and the session.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { SesionProvider } from '@/modules/acceso/components/SesionProvider'
import { ErrorApi } from '@/lib/api/cliente'
import type { Usuario } from '@/types/usuario'

export interface ProveedoresProps {
  /** Omit to restore the session from storage; pass null/user to force it (tests, demos). */
  usuarioInicial?: Usuario | null
  children: ReactNode
}

/** Retries once on network/server failures, never on 4xx answers (a 404 will not fix itself). */
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
