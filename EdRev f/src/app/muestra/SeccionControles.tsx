/* SeccionControles — parte del muestrario del sistema de diseño (solo desarrollo). */
import { useState } from 'react'
import { Seccion } from './Seccion'
import { Boton } from '@/components/common/Boton'
import { Buscador } from '@/components/common/Buscador'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'

export function SeccionControles() {
  const [tipo, setTipo] = useState<string | undefined>()
  return (
    <>
      <Seccion titulo="Boton">
        <div className="flex flex-wrap items-center gap-3">
          <Boton>Normal</Boton>
          <Boton className="bg-cesmag-azul-panel">Hover</Boton>
          <Boton className="bg-cesmag-azul-oscuro">Activo</Boton>
          <Boton className="outline outline-2 outline-offset-2 outline-borde-foco">Foco</Boton>
          <Boton disabled>Deshabilitado</Boton>
          <Boton cargando>Guardando</Boton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Boton variante="primario">Primario</Boton>
          <Boton variante="secundario">Secundario</Boton>
          <Boton variante="neutro">Neutro</Boton>
          <Boton variante="texto">Texto</Boton>
          <Boton variante="peligro">Peligro</Boton>
          <Boton tamano="sm">Primario sm</Boton>
          <Boton variante="secundario" tamano="sm">
            Secundario sm
          </Boton>
          <Boton variante="peligro" tamano="sm" disabled>
            Peligro sm
          </Boton>
        </div>
      </Seccion>

      <Seccion titulo="CampoTexto, ListaDesplegable y Buscador">
        <div className="grid grid-cols-3 gap-4">
          <CampoTexto etiqueta="Normal" placeholder="nombre.apellido@unicesmag.edu.co" />
          <CampoTexto etiqueta="Enfocado (clic o Tab)" defaultValue="2026-035" />
          <CampoTexto
            etiqueta="Con error"
            defaultValue="2026-034"
            error="El número ya está registrado en esta revista."
          />
          <CampoTexto etiqueta="Deshabilitado" defaultValue="Educación y Pedagogía" disabled />
          <ListaDesplegable
            etiqueta="Tipo de artículo"
            opciones={[
              { valor: 'investigacion', etiqueta: 'Investigación' },
              { valor: 'reflexion', etiqueta: 'Reflexión' },
              { valor: 'revision', etiqueta: 'Revisión' },
            ]}
            valor={tipo}
            onCambio={setTipo}
          />
          <Buscador
            etiqueta="Buscar por título o número de OJS"
            placeholder="Buscar por título o número de OJS"
          />
        </div>
      </Seccion>
    </>
  )
}
