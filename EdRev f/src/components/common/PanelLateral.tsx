/*
 * PanelLateral — 240 px side navigation. Common modules, then the two journals as collapsible
 * groups with six submodules. Only one group is open and it marks the active journal.
 * The current item is highlighted and does not navigate.
 * Covers: RF-02, RF-36 (entry points), RNF-11 (nav landmark, keyboard, focus ring on dark).
 */
import * as Collapsible from '@radix-ui/react-collapsible'
import { Link } from 'react-router-dom'
import { Boton } from './Boton'
import { Escudo } from './Escudo'
import { cn } from '@/lib/cn'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

export interface UsuarioPanel {
  nombre: string
  perfil: string
}

export interface PanelLateralProps {
  /** Active journal (open group) or null on the common modules. */
  revistaActiva: Revista | null
  /** Current pathname, used to highlight the current item. */
  rutaActual: string
  usuario: UsuarioPanel
  /** Called when a closed journal group is opened (the app navigates to its dashboard). */
  onAbrirRevista: (revista: Revista) => void
  onCerrarSesion: () => void
  /** False hides the Administración module (the Auxiliar has no access to it). */
  mostrarAdministracion?: boolean
}

const MODULOS_COMUNES = [
  { etiqueta: 'Inicio', ruta: '/inicio' },
  { etiqueta: 'Informes', ruta: '/informes' },
  { etiqueta: 'Administración', ruta: '/administracion/usuarios' },
]

const SUBMODULOS = [
  { etiqueta: 'Tablero', ruta: 'tablero' },
  { etiqueta: 'Artículos', ruta: 'articulos' },
  { etiqueta: 'Autores', ruta: 'autores' },
  { etiqueta: 'Pares evaluadores', ruta: 'pares' },
  { etiqueta: 'Constancias', ruta: 'constancias' },
  { etiqueta: 'Correos enviados', ruta: 'correos' },
]

const ITEM =
  'flex min-h-control items-center rounded-md px-3 text-cuerpo-15 text-texto-inverso hover:bg-velo-panel focus-visible:outline-texto-inverso'

interface ItemNavProps {
  etiqueta: string
  ruta: string
  rutaActual: string
  /** Prefix that keeps the item highlighted on its sub-routes (defaults to its own route). */
  prefijo?: string
  className?: string
}

function ItemNav({ etiqueta, ruta, rutaActual, prefijo, className }: ItemNavProps) {
  const exacto = rutaActual === ruta
  const dentro = rutaActual.startsWith(`${prefijo ?? ruta}/`)
  if (exacto) {
    // Current page: highlighted, not a link.
    return (
      <span
        aria-current="page"
        className={cn(ITEM, 'bg-velo-panel text-cuerpo-15-enfasis', className)}
      >
        {etiqueta}
      </span>
    )
  }
  return (
    <Link
      to={ruta}
      aria-current={dentro ? 'location' : undefined}
      className={cn(ITEM, dentro && 'bg-velo-panel text-cuerpo-15-enfasis', className)}
    >
      {etiqueta}
    </Link>
  )
}

export function PanelLateral({
  revistaActiva,
  rutaActual,
  usuario,
  onAbrirRevista,
  onCerrarSesion,
  mostrarAdministracion = true,
}: PanelLateralProps) {
  const comunes = mostrarAdministracion
    ? MODULOS_COMUNES
    : MODULOS_COMUNES.filter((m) => !m.ruta.startsWith('/administracion'))
  return (
    <aside className="flex w-panel min-w-panel flex-col bg-cesmag-azul-panel text-texto-inverso">
      <div className="flex items-center gap-3 px-4 py-5">
        <Escudo tamano="lg" alt="Escudo de la Universidad CESMAG" />
        <div>
          <p className="text-titulo-16">EdRev Cesmag</p>
          <p className="text-cuerpo-13">Dependencia de Editorial</p>
        </div>
      </div>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
        <ul className="flex flex-col gap-1">
          {comunes.map((m) => (
            <li key={m.ruta}>
              <ItemNav
                etiqueta={m.etiqueta}
                ruta={m.ruta}
                rutaActual={rutaActual}
                prefijo={m.ruta.startsWith('/administracion') ? '/administracion' : undefined}
              />
            </li>
          ))}
        </ul>

        <hr className="my-2 border-velo-panel" />

        <ul className="flex flex-col gap-1">
          {(Object.keys(REVISTAS) as Revista[]).map((id) => {
            const datos = REVISTAS[id]
            const abierto = revistaActiva === id
            return (
              <li key={id}>
                <Collapsible.Root
                  open={abierto}
                  onOpenChange={(abrir) => {
                    if (abrir) onAbrirRevista(id)
                  }}
                >
                  <Collapsible.Trigger
                    className={cn(
                      ITEM,
                      'w-full justify-between text-left',
                      abierto && 'text-cuerpo-15-enfasis',
                    )}
                  >
                    <span>
                      {datos.nombreCorto}
                      <span className="block text-cuerpo-13">Módulo {datos.modulo}</span>
                    </span>
                    <span aria-hidden="true">{abierto ? '▾' : '▸'}</span>
                  </Collapsible.Trigger>
                  <Collapsible.Content>
                    <ul className="mt-1 flex flex-col gap-1 pl-3">
                      {SUBMODULOS.map((s) => (
                        <li key={s.ruta}>
                          <ItemNav
                            etiqueta={s.etiqueta}
                            ruta={`/${id}/${s.ruta}`}
                            rutaActual={rutaActual}
                          />
                        </li>
                      ))}
                    </ul>
                  </Collapsible.Content>
                </Collapsible.Root>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-velo-panel p-4">
        <p className="text-cuerpo-15-enfasis">{usuario.nombre}</p>
        <p className="mb-2 text-cuerpo-13">{usuario.perfil}</p>
        <Boton
          variante="texto"
          tamano="sm"
          onClick={onCerrarSesion}
          className="-ml-3 text-texto-inverso hover:bg-velo-panel focus-visible:outline-texto-inverso"
        >
          Cerrar sesión
        </Boton>
      </div>
    </aside>
  )
}
