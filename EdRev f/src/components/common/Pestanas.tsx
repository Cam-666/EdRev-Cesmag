/*
 * Pestanas — lista de pestañas sobre Radix Tabs (flechas, Inicio y Fin según el patrón de pestañas WAI-ARIA).
 * Se usa en la ficha del artículo.
 */
import * as Tabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

export interface PestanaDef {
  valor: string
  etiqueta: string
  /** Contenido opcional del panel; se omite cuando el panel se dibuja en otro lugar (por ejemplo un Outlet del enrutador). */
  contenido?: ReactNode
}

export interface PestanasProps {
  etiqueta: string
  pestanas: PestanaDef[]
  valor?: string
  valorInicial?: string
  onCambio?: (valor: string) => void
}

export function Pestanas({ etiqueta, pestanas, valor, valorInicial, onCambio }: PestanasProps) {
  const primera = pestanas[0]?.valor
  return (
    <Tabs.Root
      value={valor}
      defaultValue={valor === undefined ? (valorInicial ?? primera) : undefined}
      onValueChange={onCambio}
    >
      <Tabs.List aria-label={etiqueta} className="flex gap-1 border-b border-borde-base">
        {pestanas.map((p) => (
          <Tabs.Trigger
            key={p.valor}
            value={p.valor}
            className="-mb-px min-h-control border-b-2 border-transparent px-4 text-etiqueta-13 text-texto-secundario hover:text-texto-principal data-[state=active]:border-cesmag-azul data-[state=active]:text-cesmag-azul"
          >
            {p.etiqueta}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {pestanas.map((p) =>
        p.contenido === undefined ? null : (
          <Tabs.Content key={p.valor} value={p.valor} className="pt-4">
            {p.contenido}
          </Tabs.Content>
        ),
      )}
    </Tabs.Root>
  )
}
