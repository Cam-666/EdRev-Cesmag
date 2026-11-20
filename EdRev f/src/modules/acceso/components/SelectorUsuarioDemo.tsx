/*
 * SelectorUsuarioDemo — SOLO PARA DEMOSTRACIÓN (no tiene diseño en Figma): cambia el usuario simulado para poder
 * mostrar los permisos de cada perfil (Administradora y Auxiliar). Se oculta cuando los datos de ejemplo están apagados.
 */
import { useSesion } from '../hooks/useSesion'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { mocksActivos } from '@/mocks/habilitar'
import { tokenMock } from '@/mocks/token'
import { USUARIOS_SEED } from '@/mocks/seed/usuarios'
import { ETIQUETA_PERFIL } from '@/types/usuario'

export function SelectorUsuarioDemo() {
  const { usuario, iniciarSesion } = useSesion()
  if (!mocksActivos() || !usuario) return null

  const activos = USUARIOS_SEED.filter((u) => u.estado === 'activo')
  return (
    <aside
      aria-label="Demostración"
      className="w-60 fixed bottom-4 right-4 z-30 rounded-lg border border-borde-fuerte bg-superficie-tarjeta p-3 shadow-tarjeta"
    >
      <ListaDesplegable
        etiqueta="Demostración · Usuario"
        valor={usuario.id}
        onCambio={(id) => {
          const elegido = activos.find((u) => u.id === id)
          if (elegido) iniciarSesion({ usuario: elegido, token: tokenMock(elegido.id) })
        }}
        opciones={activos.map((u) => ({
          valor: u.id,
          etiqueta: `${u.nombre} · ${ETIQUETA_PERFIL[u.perfil]}`,
        }))}
      />
    </aside>
  )
}
