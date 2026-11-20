/*
 * FormularioAutor — formulario de autor: busca un registro existente por nombre u ORCID (al elegir uno se llenan
 * los datos y quedan de solo lectura) o se escribe un autor nuevo. Lo reutilizan el paso 2 del registro y el modal
 * «Agregar autor» de la ficha del artículo. El campo de correo no tiene diseño en Figma, pero es obligatorio.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { esquemaAutor } from '../config/esquemas'
import type { AutorForm } from '../config/esquemas'
import { useBuscarAutores } from '../hooks/useBuscarAutores'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import type { Autor, DatosAutor } from '@/types/autor'

export interface AutorElegido {
  /** Registro existente que se reutiliza, o null cuando el autor es nuevo. */
  autorId: string | null
  datos: DatosAutor
}

export interface FormularioAutorProps {
  textoBoton: string
  onGuardar: (autor: AutorElegido) => void
  /** Permite buscar registros existentes (apagado al editar un registro). */
  permitirBuscar?: boolean
  valoresIniciales?: DatosAutor
  /** Ids de registros existentes que no se pueden elegir (ya están en el artículo). */
  idsExcluidos?: string[]
  cargando?: boolean
  error?: string
  /**
   * Limpia el formulario después de enviar (el paso 2 agrega varios autores uno tras otro). Se deja apagado en los
   * diálogos: si el servidor rechaza los datos, la persona no debe perder lo que escribió.
   */
  reiniciar?: boolean
}

const VACIO: AutorForm = { nombre: '', correo: '', orcid: '', filiacion: '', pais: 'Colombia' }

export function FormularioAutor({
  textoBoton,
  onGuardar,
  permitirBuscar = true,
  valoresIniciales,
  idsExcluidos = [],
  cargando = false,
  error,
  reiniciar = false,
}: FormularioAutorProps) {
  const [busqueda, setBusqueda] = useState('')
  const [elegido, setElegido] = useState<Autor | null>(null)
  const buscando = permitirBuscar && elegido === null && busqueda.trim().length >= 2
  const resultados = useBuscarAutores(busqueda, 5, buscando)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AutorForm>({
    resolver: zodResolver(esquemaAutor),
    defaultValues: valoresIniciales ?? VACIO,
  })

  const fichas = buscando
    ? (resultados.data?.items ?? []).filter((a) => !idsExcluidos.includes(a.id))
    : []

  function elegir(autor: Autor) {
    setElegido(autor)
    setBusqueda('')
    reset({
      nombre: autor.nombre,
      correo: autor.correo,
      orcid: autor.orcid,
      filiacion: autor.filiacion,
      pais: autor.pais,
    })
  }

  function limpiar() {
    setElegido(null)
    reset(VACIO)
  }

  function enviar(datos: AutorForm) {
    onGuardar({ autorId: elegido?.id ?? null, datos })
    if (reiniciar) {
      setElegido(null)
      setBusqueda('')
      reset(VACIO)
    }
  }

  const soloLectura = elegido !== null

  return (
    <div className="flex flex-col gap-4">
      {permitirBuscar && (
        <div className="flex flex-col gap-2">
          <CampoTexto
            etiqueta="Buscar ficha existente"
            type="search"
            placeholder="Nombre u ORCID"
            ayuda="Si el autor ya postuló un artículo, sus datos se completan automáticamente."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            disabled={soloLectura}
          />
          <p role="status" className="sr-only">
            {buscando && !resultados.isFetching ? `${fichas.length} fichas encontradas` : ''}
          </p>
          {fichas.length > 0 && (
            <ul aria-label="Fichas encontradas" className="flex flex-col gap-1">
              {fichas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => elegir(a)}
                    className="flex w-full flex-col rounded-md border border-borde-fuerte bg-superficie-tarjeta px-3 py-2 text-left hover:bg-estado-info-fondo"
                  >
                    <span className="text-cuerpo-15-enfasis text-texto-principal">{a.nombre}</span>
                    <span className="text-cuerpo-13 text-texto-secundario">
                      {[a.orcid, a.filiacion].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {buscando && !resultados.isFetching && fichas.length === 0 && (
            <p className="text-cuerpo-13 text-texto-secundario">
              No hay fichas con ese nombre u ORCID. Complete los datos para registrar un autor
              nuevo.
            </p>
          )}
          {soloLectura && (
            <Alerta
              tipo="informacion"
              accion={
                <Boton variante="texto" tamano="sm" onClick={limpiar}>
                  Usar otro autor
                </Boton>
              }
            >
              Ficha existente de {elegido.nombre}. Sus datos se llenaron solos.
            </Alerta>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-3">
        {error && <Alerta tipo="error">{error}</Alerta>}
        <CampoTexto
          etiqueta="Nombre completo"
          autoComplete="off"
          readOnly={soloLectura}
          error={errors.nombre?.message}
          {...register('nombre')}
        />
        <CampoTexto
          etiqueta="Correo electrónico"
          type="email"
          autoComplete="off"
          readOnly={soloLectura}
          error={errors.correo?.message}
          {...register('correo')}
        />
        <CampoTexto
          etiqueta="ORCID (opcional)"
          placeholder="0000-0000-0000-0000"
          autoComplete="off"
          readOnly={soloLectura}
          error={errors.orcid?.message}
          {...register('orcid')}
        />
        <CampoTexto
          etiqueta="Filiación"
          autoComplete="off"
          readOnly={soloLectura}
          error={errors.filiacion?.message}
          {...register('filiacion')}
        />
        <CampoTexto
          etiqueta="País"
          autoComplete="off"
          readOnly={soloLectura}
          error={errors.pais?.message}
          {...register('pais')}
        />
        <Boton type="submit" cargando={cargando}>
          {textoBoton}
        </Boton>
      </form>
    </div>
  )
}
