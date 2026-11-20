/*
 * ArticuloNuevoPage — Registrar artículo (/:revista/articulos/nuevo): un formulario con los datos del artículo
 * (número de OJS, fecha, título, un solo tipo) y sus autores (hasta siete, reutilizados del directorio común,
 * con el orden conservado). Al guardar se registra el artículo como Postulado y se abre su pestaña «Revisión del
 * comité» con el formulario de ronda, donde se registran el reporte antiplagio y el resultado del comité.
 * Advierte, sin bloquear, de un número de OJS repetido.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormularioDatosArticulo } from '../components/FormularioDatosArticulo'
import { ListaAutoresBorrador } from '../components/ListaAutoresBorrador'
import { MAX_AUTORES } from '../config/listas'
import { useBorradorArticulo } from '../hooks/useBorradorArticulo'
import type { DatosBorrador } from '../hooks/useBorradorArticulo'
import { useCrearArticulo } from '../hooks/useMutacionesArticulo'
import { FormularioAutor } from '@/modules/autores/components/FormularioAutor'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { BotonVolver } from '@/components/common/BotonVolver'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { mensajeDeApi } from '@/lib/api/errores'
import { useRevista } from '@/lib/revista/useRevista'
import type { TipoArticulo } from '@/types/articulo'

const FORMULARIO = 'formulario-datos-articulo'

export function ArticuloNuevoPage() {
  const { revista } = useRevista()
  const navigate = useNavigate()
  const { borrador, guardarDatos, agregarAutor, quitarAutor, descartar, limpiar } =
    useBorradorArticulo()
  const crear = useCrearArticulo()
  const [sinAutores, setSinAutores] = useState(false)
  const completo = borrador.autores.length >= MAX_AUTORES

  function guardar(datos: DatosBorrador) {
    guardarDatos(datos)
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
          descartar()
          navigate(`/${revista}/articulos/${encodeURIComponent(creado.id)}/comite?registrar=1`)
        },
      },
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <BotonVolver to={`/${revista}/articulos`}>Volver a artículos</BotonVolver>
      <EncabezadoPagina
        titulo="Registrar artículo"
        acciones={
          <>
            <Boton type="submit" form={FORMULARIO} tamano="sm" cargando={crear.isPending}>
              Guardar artículo
            </Boton>
            <Boton
              variante="neutro"
              tamano="sm"
              onClick={() => {
                limpiar()
                navigate(`/${revista}/articulos`)
              }}
            >
              Cancelar
            </Boton>
          </>
        }
      />

      {sinAutores && borrador.autores.length === 0 && (
        <Alerta tipo="error">Agregue al menos un autor antes de guardar el artículo.</Alerta>
      )}
      {crear.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(crear.error, 'No fue posible guardar el artículo. Intente de nuevo.')}
        </Alerta>
      )}

      <FormularioDatosArticulo
        idFormulario={FORMULARIO}
        valoresIniciales={borrador.datos}
        onContinuar={guardar}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_320px]">
        <section
          aria-labelledby="titulo-nuevo-autor"
          className="flex h-fit flex-col gap-4 rounded-lg border-2 border-texto-enlace bg-superficie-tarjeta p-6 shadow-tarjeta"
        >
          <div className="flex flex-col gap-1">
            <h2 id="titulo-nuevo-autor" className="text-titulo-20">
              Agregar autor
            </h2>
            <p className="text-cuerpo-13 text-texto-secundario">
              Busque un autor del directorio o registre uno nuevo; se agregará al final de la lista.
            </p>
          </div>
          {completo ? (
            <Alerta tipo="advertencia">Se alcanzó el máximo de {MAX_AUTORES} autores.</Alerta>
          ) : (
            <FormularioAutor
              textoBoton="Agregar"
              reiniciar
              idsExcluidos={borrador.autores.flatMap((a) => (a.autorId ? [a.autorId] : []))}
              onGuardar={(autor) => {
                setSinAutores(false)
                agregarAutor(autor)
              }}
            />
          )}
        </section>
        <ListaAutoresBorrador autores={borrador.autores} onQuitar={quitarAutor} />
      </div>
    </section>
  )
}
