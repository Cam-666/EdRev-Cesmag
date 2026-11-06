/*
 * ArticuloNuevoAutoresPage — Registrar artículo, paso 2 de 2 · Autores
 * (/:revista/articulos/nuevo/autores): up to seven authors, searchable existing records, order
 * kept; saving creates the article. Covers: RF-01, RF-09, RF-10, HU-01, HU-06, HU-07.
 */
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ListaAutoresBorrador } from '../components/ListaAutoresBorrador'
import { PasosAlta } from '../components/PasosAlta'
import { MAX_AUTORES } from '../config/listas'
import { useBorradorArticulo } from '../hooks/useBorradorArticulo'
import { useCrearArticulo } from '../hooks/useMutacionesArticulo'
import { FormularioAutor } from '@/modules/autores/components/FormularioAutor'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import { useRevista } from '@/lib/revista/useRevista'
import type { TipoArticulo } from '@/types/articulo'

export function ArticuloNuevoAutoresPage() {
  const { revista } = useRevista()
  const navigate = useNavigate()
  const { borrador, agregarAutor, quitarAutor, descartar } = useBorradorArticulo()
  const crear = useCrearArticulo()
  const [sinAutores, setSinAutores] = useState(false)

  if (!borrador.datos) return <Navigate to={`/${revista}/articulos/nuevo`} replace />
  const datos = borrador.datos
  const completo = borrador.autores.length >= MAX_AUTORES

  function guardar() {
    if (borrador.autores.length === 0) {
      setSinAutores(true)
      return
    }
    crear.mutate(
      {
        numeroOjs: datos.numeroOjs,
        titulo: datos.titulo,
        tipo: datos.tipo as TipoArticulo,
        fechaPostulacion: datos.fechaPostulacion,
        autores: borrador.autores.map((a) =>
          a.autorId ? { autorId: a.autorId } : { nuevo: a.datos },
        ),
      },
      {
        onSuccess: (creado) => {
          // Not `limpiar`: clearing state would re-render this page and its guard would send
          // the user back to step 1 instead of to the new article.
          descartar()
          navigate(`/${revista}/articulos/${encodeURIComponent(creado.id)}`)
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <AccionesEncabezado>
        <Boton tamano="sm" onClick={guardar} cargando={crear.isPending}>
          Guardar
        </Boton>
        <EnlaceBoton variante="neutro" tamano="sm" to={`/${revista}/articulos/nuevo`}>
          Volver
        </EnlaceBoton>
      </AccionesEncabezado>
      <header>
        <h1 className="text-titulo-24">Autores del artículo</h1>
        <p className="text-cuerpo-13 text-texto-secundario">Paso 2 de 2 · {datos.numeroOjs}</p>
      </header>

      {sinAutores && borrador.autores.length === 0 && (
        <Alerta tipo="error">Agregue al menos un autor antes de guardar el artículo.</Alerta>
      )}
      {crear.isError && (
        <Alerta tipo="error">
          No fue posible guardar el artículo. Intente de nuevo en unos minutos.
        </Alerta>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px_240px]">
        <ListaAutoresBorrador autores={borrador.autores} onQuitar={quitarAutor} />
        <section
          aria-labelledby="titulo-nuevo-autor"
          className="flex h-fit flex-col gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
        >
          <h2 id="titulo-nuevo-autor" className="text-titulo-16">
            Nuevo autor
          </h2>
          {completo ? (
            <Alerta tipo="advertencia">Se alcanzó el máximo de {MAX_AUTORES} autores.</Alerta>
          ) : (
            <FormularioAutor
              textoBoton="Agregar"
              idsExcluidos={borrador.autores.flatMap((a) => (a.autorId ? [a.autorId] : []))}
              onGuardar={(autor) => {
                setSinAutores(false)
                agregarAutor(autor)
              }}
            />
          )}
        </section>
        <PasosAlta actual={2} />
      </div>
    </section>
  )
}
