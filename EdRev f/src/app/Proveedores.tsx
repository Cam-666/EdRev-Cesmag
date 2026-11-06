/*
 * Proveedores — global providers: server-state cache (TanStack Query) and the session.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { SesionProvider } from '@/modules/acceso/components/SesionProvider'
import type { Usuario } from '@/types/usuario'

export interface ProveedoresProps {
  /** Omit to restore the session from storage; pass null/user to force it (tests, demos). */
  usuarioInicial?: Usuario | null
  children: ReactNode
}

export function Proveedores({ usuarioInicial, children }: ProveedoresProps) {
  const [cliente] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  )
  return (
    <QueryClientProvider client={cliente}>
      <SesionProvider usuarioInicial={usuarioInicial}>{children}</SesionProvider>
    </QueryClientProvider>
  )
}
