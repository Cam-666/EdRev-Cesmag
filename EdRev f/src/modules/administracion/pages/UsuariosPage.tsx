/*
 * UsuariosPage — Usuarios y permisos (/administracion/usuarios): the accounts of the dependency
 * with profile, last access and status, create / edit / disable, and the permissions matrix.
 * Administradora only. Covers: RF-40, HU-29, RNF-05.
 */
import { useState } from 'react'
import { MatrizPermisos } from '../components/MatrizPermisos'
import { UsuarioModal } from '../components/UsuarioModal'
import { PERFILES } from '../config/perfiles'
import { useUsuarios } from '../hooks/useAdmin'
import { Boton } from '@/components/common/Boton'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import { formatearFechaHora } from '@/lib/format'
import type { Usuario } from '@/types/usuario'

export function UsuariosPage() {
  const consulta = useUsuarios()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const total = consulta.data?.length ?? 0

  const columnas: Array<ColumnaTabla<Usuario>> = [
    {
      clave: 'usuario',
      encabezado: 'Usuario',
      render: (u) => (
        <span className="flex flex-col">
          <span className="text-cuerpo-15-enfasis">{u.nombre}</span>
          <span className="text-cuerpo-13 text-texto-secundario">{u.correo}</span>
        </span>
      ),
    },
    {
      clave: 'perfil',
      encabezado: 'Perfil',
      render: (u) => PERFILES.find((p) => p.valor === u.perfil)?.etiqueta ?? u.perfil,
    },
    {
      clave: 'ingreso',
      encabezado: 'Último ingreso',
      render: (u) => (u.ultimoIngreso ? formatearFechaHora(u.ultimoIngreso) : 'Nunca'),
      className: 'whitespace-nowrap',
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (u) => (
        <DistintivoEstado estado={u.estado === 'activo' ? 'activo' : 'inhabilitado'} />
      ),
    },
    {
      clave: 'acciones',
      encabezado: 'Acciones',
      render: (u) => (
        <Boton variante="texto" tamano="sm" onClick={() => setEditando(u)}>
          Editar <span className="sr-only">a {u.nombre}</span>
        </Boton>
      ),
    },
  ]

  return (
    <section className="flex flex-col gap-6">
      <AccionesEncabezado>
        <Boton tamano="sm" onClick={() => setCreando(true)}>
          Crear usuario
        </Boton>
      </AccionesEncabezado>

      <section aria-labelledby="titulo-usuarios" className="flex flex-col gap-3">
        <div>
          <h2 id="titulo-usuarios" className="text-titulo-16">
            Usuarios
          </h2>
          <p role="status" className="text-cuerpo-13 text-texto-secundario">
            {consulta.data
              ? `${total} ${total === 1 ? 'cuenta' : 'cuentas'} de la dependencia`
              : ' '}
          </p>
        </div>
        <EstadoConsulta
          cargando={false}
          error={consulta.isError}
          onReintentar={() => void consulta.refetch()}
          descripcion="los usuarios"
        >
          <Tabla
            etiqueta="Usuarios de la dependencia"
            columnas={columnas}
            filas={consulta.data ?? []}
            obtenerClave={(u) => u.id}
            cargando={consulta.isPending}
          />
        </EstadoConsulta>
      </section>

      <MatrizPermisos />

      <UsuarioModal abierto={creando} onCerrar={() => setCreando(false)} />
      <UsuarioModal
        abierto={editando !== null}
        usuario={editando ?? undefined}
        onCerrar={() => setEditando(null)}
      />
    </section>
  )
}
