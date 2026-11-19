/*
 * SeccionPanel — part of the design-system showcase (development only).
 * Covers: RNF-11, RNF-12.
 */
import { Seccion } from './Seccion'
import { PanelLateral } from '@/components/common/PanelLateral'

export function SeccionPanel() {
  return (
    <>
      <Seccion titulo="PanelLateral (grupos que se abren y cierran)">
        <div className="flex h-[640px]">
          <PanelLateral
            revistaActiva="reep"
            rutaActual="/reep/articulos"
            usuario={{ nombre: 'Ma. Camila Mendoza', perfil: 'Administradora' }}
            onCerrarSesion={() => undefined}
          />
        </div>
      </Seccion>
    </>
  )
}
