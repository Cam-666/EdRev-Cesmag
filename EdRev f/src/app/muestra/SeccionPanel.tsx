/*
 * SeccionPanel — part of the design-system showcase (development only).
 * Covers: RNF-11, RNF-12.
 */
import { useState } from 'react'
import { Seccion } from './Seccion'
import type { Revista } from '@/types/revista'
import { PanelLateral } from '@/components/common/PanelLateral'

export function SeccionPanel() {
  const [revistaPanel, setRevistaPanel] = useState<Revista | null>('reep')
  return (
    <>
      <Seccion titulo="PanelLateral (un solo grupo abierto)">
        <div className="flex h-[640px]">
          <PanelLateral
            revistaActiva={revistaPanel}
            rutaActual={revistaPanel ? `/${revistaPanel}/articulos` : '/inicio'}
            usuario={{ nombre: 'Ma. Camila Mendoza', perfil: 'Administradora' }}
            onAbrirRevista={setRevistaPanel}
            onCerrarSesion={() => setRevistaPanel(null)}
          />
        </div>
      </Seccion>
    </>
  )
}
