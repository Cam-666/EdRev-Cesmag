/*
 * ArticuloNuevoPage — Registrar artículo, paso 1 de 2 · Datos (/:revista/articulos/nuevo).
 * Warns (without blocking) when the OJS number already exists in the journal.
 * Covers: RF-01, RF-02, RF-03, HU-01.
 */
import { useNavigate } from 'react-router-dom'
import { FormularioDatosArticulo } from '../components/FormularioDatosArticulo'
import { PasosAlta } from '../components/PasosAlta'
import { useBorradorArticulo } from '../hooks/useBorradorArticulo'
import { Boton } from '@/components/common/Boton'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import { useRevista } from '@/lib/revista/useRevista'

const FORMULARIO = 'formulario-datos-articulo'

export function ArticuloNuevoPage() {
  const { revista } = useRevista()
  const navigate = useNavigate()
  const { borrador, guardarDatos, limpiar } = useBorradorArticulo()

  return (
    <section className="flex flex-col gap-4">
      <AccionesEncabezado>
        <Boton type="submit" form={FORMULARIO} tamano="sm">
          Continuar
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
      </AccionesEncabezado>
      <header>
        <h1 className="text-titulo-24">Registrar artículo</h1>
        <p className="text-cuerpo-13 text-texto-secundario">Paso 1 de 2 · Datos</p>
      </header>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <FormularioDatosArticulo
          idFormulario={FORMULARIO}
          valoresIniciales={borrador.datos}
          onContinuar={(datos) => {
            guardarDatos(datos)
            navigate(`/${revista}/articulos/nuevo/autores`)
          }}
        />
        <PasosAlta actual={1} />
      </div>
    </section>
  )
}
