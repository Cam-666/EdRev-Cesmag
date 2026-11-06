/*
 * MuestraDiseno — design system showcase (dev-only route /design-system, not part of the product).
 * Covers: RNF-11, RNF-12 (visual verification of states, contrast and focus).
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import { Alerta } from '@/design-system/Alerta'
import { Boton } from '@/design-system/Boton'
import { Buscador } from '@/design-system/Buscador'
import { CampoTexto } from '@/design-system/CampoTexto'
import { ChipAreaTematica } from '@/design-system/ChipAreaTematica'
import { DistintivoEstado, DEFINICIONES_ESTADO } from '@/design-system/DistintivoEstado'
import type { EstadoDistintivo } from '@/design-system/DistintivoEstado'
import { EncabezadoRevista } from '@/design-system/EncabezadoRevista'
import { FilaCorreoEnviado } from '@/design-system/FilaCorreoEnviado'
import { FilaParAsignado } from '@/design-system/FilaParAsignado'
import { ListaDesplegable } from '@/design-system/ListaDesplegable'
import { Paginacion } from '@/design-system/Paginacion'
import { PanelLateral } from '@/design-system/PanelLateral'
import { Pestanas } from '@/design-system/Pestanas'
import { Tabla } from '@/design-system/Tabla'
import { TarjetaMetrica } from '@/design-system/TarjetaMetrica'
import type { Revista } from '@/types/revista'

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-titulo-20">{titulo}</h2>
      {children}
    </section>
  )
}

const COLORES: Array<{ nombre: string; clase: string }> = [
  { nombre: 'cesmag-azul', clase: 'bg-cesmag-azul' },
  { nombre: 'cesmag-azul-panel', clase: 'bg-cesmag-azul-panel' },
  { nombre: 'cesmag-azul-oscuro', clase: 'bg-cesmag-azul-oscuro' },
  { nombre: 'cesmag-rojo', clase: 'bg-cesmag-rojo' },
  { nombre: 'neutro-0', clase: 'bg-neutro-0' },
  { nombre: 'neutro-50', clase: 'bg-neutro-50' },
  { nombre: 'neutro-100', clase: 'bg-neutro-100' },
  { nombre: 'neutro-200', clase: 'bg-neutro-200' },
  { nombre: 'neutro-300', clase: 'bg-neutro-300' },
  { nombre: 'neutro-400 (decorativo)', clase: 'bg-neutro-400' },
  { nombre: 'neutro-600', clase: 'bg-neutro-600' },
  { nombre: 'neutro-800', clase: 'bg-neutro-800' },
  { nombre: 'neutro-900', clase: 'bg-neutro-900' },
  { nombre: 'estado-exito', clase: 'bg-estado-exito' },
  { nombre: 'estado-alerta', clase: 'bg-estado-alerta' },
  { nombre: 'estado-error', clase: 'bg-estado-error' },
  { nombre: 'estado-info', clase: 'bg-estado-info' },
]

const TIPOGRAFIA: Array<{ nombre: string; clase: string }> = [
  { nombre: 'Display 32/40', clase: 'text-display' },
  { nombre: 'Título 24', clase: 'text-titulo-24' },
  { nombre: 'Título 20', clase: 'text-titulo-20' },
  { nombre: 'Título 16', clase: 'text-titulo-16' },
  { nombre: 'Cuerpo 15', clase: 'text-cuerpo-15' },
  { nombre: 'Cuerpo 15 énfasis', clase: 'text-cuerpo-15-enfasis' },
  { nombre: 'Cuerpo 13', clase: 'text-cuerpo-13' },
  { nombre: 'Etiqueta 13', clase: 'text-etiqueta-13' },
  { nombre: 'Micro 11', clase: 'text-micro-11 uppercase' },
]

interface FilaDemo {
  ojs: string
  titulo: string
  estado: EstadoDistintivo
}

const FILAS: FilaDemo[] = [
  {
    ojs: '2026-034',
    titulo: 'Alfabetización mediática en la formación de maestros',
    estado: 'en-evaluacion',
  },
  { ojs: '2026-024', titulo: 'Convivencia escolar en contextos rurales', estado: 'aprobado' },
  { ojs: '2026-007', titulo: 'Formación ciudadana y memoria histórica', estado: 'archivado' },
]

export function MuestraDiseno() {
  const [revistaPanel, setRevistaPanel] = useState<Revista | null>('reep')
  const [pagina, setPagina] = useState(1)
  const [tipo, setTipo] = useState<string | undefined>()

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-10 p-6">
      <h1 className="text-display">Sistema de diseño · CESMAG</h1>

      <Seccion titulo="Colores (tokens)">
        <ul className="grid grid-cols-4 gap-3">
          {COLORES.map((c) => (
            <li key={c.nombre} className="flex items-center gap-2 text-cuerpo-13">
              <span className={`h-8 w-8 rounded-md border border-borde-fuerte ${c.clase}`} />
              {c.nombre}
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Tipografía (Inter)">
        <ul className="flex flex-col gap-2">
          {TIPOGRAFIA.map((t) => (
            <li key={t.nombre} className={t.clase}>
              {t.nombre} — Registro editorial de artículos
            </li>
          ))}
        </ul>
      </Seccion>

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

      <Seccion titulo="DistintivoEstado (símbolo + texto)">
        <ul className="flex flex-wrap gap-2">
          {(Object.keys(DEFINICIONES_ESTADO) as EstadoDistintivo[]).map((e) => (
            <li key={e}>
              <DistintivoEstado estado={e} />
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Alerta">
        <div className="flex flex-col gap-3">
          <Alerta tipo="informacion">
            Si la cuenta existe, recibirá un enlace en los próximos minutos.
          </Alerta>
          <Alerta tipo="advertencia" titulo="Antiplagio por encima del 15 %">
            Supera el 15 % aceptado. No bloquea el proceso.
          </Alerta>
          <Alerta
            tipo="error"
            accion={
              <Boton variante="secundario" tamano="sm">
                Corregir y reenviar
              </Boton>
            }
          >
            La dirección j.rosero@umariana.edu.co rebotó.
          </Alerta>
          <Alerta tipo="exito">Invitación enviada a Óscar Iván Benavides.</Alerta>
        </div>
      </Seccion>

      <Seccion titulo="Pestanas (flechas, Inicio y Fin)">
        <Pestanas
          etiqueta="Secciones del artículo"
          pestanas={[
            {
              valor: 'resumen',
              etiqueta: 'Resumen',
              contenido: <p>Datos del artículo, antiplagio y comité.</p>,
            },
            { valor: 'autores', etiqueta: 'Autores', contenido: <p>Lista de autores.</p> },
            {
              valor: 'pares',
              etiqueta: 'Pares y evaluación',
              contenido: <p>Asignaciones y resultados.</p>,
            },
            {
              valor: 'observaciones',
              etiqueta: 'Observaciones',
              contenido: <p>Notas internas.</p>,
            },
            { valor: 'historial', etiqueta: 'Historial', contenido: <p>Correos y auditoría.</p> },
          ]}
        />
      </Seccion>

      <Seccion titulo="Tabla, Paginacion (normal, cargando, vacía)">
        <Tabla
          etiqueta="Artículos de ejemplo"
          filas={FILAS}
          obtenerClave={(f) => f.ojs}
          hrefFila={(f) => `/design-system#${f.ojs}`}
          etiquetaEnlace={(f) => `Abrir artículo ${f.ojs}`}
          columnas={[
            { clave: 'ojs', encabezado: 'Nº OJS', render: (f) => f.ojs },
            { clave: 'titulo', encabezado: 'Título', render: (f) => f.titulo },
            {
              clave: 'estado',
              encabezado: 'Estado',
              render: (f) => <DistintivoEstado estado={f.estado} />,
            },
          ]}
        />
        <Paginacion pagina={pagina} porPagina={6} total={142} onCambiar={setPagina} />
        <div className="grid grid-cols-2 gap-4">
          <Tabla
            etiqueta="Tabla cargando"
            filas={[]}
            cargando
            obtenerClave={() => ''}
            columnas={[
              { clave: 'a', encabezado: 'Nº OJS', render: () => null },
              { clave: 'b', encabezado: 'Título', render: () => null },
            ]}
          />
          <Tabla
            etiqueta="Tabla vacía"
            filas={[]}
            obtenerClave={() => ''}
            vacio="Aún no hay artículos registrados."
            columnas={[
              { clave: 'a', encabezado: 'Nº OJS', render: () => null },
              { clave: 'b', encabezado: 'Título', render: () => null },
            ]}
          />
        </div>
      </Seccion>

      <Seccion titulo="TarjetaMetrica y ChipAreaTematica">
        <div className="grid grid-cols-4 gap-4">
          <TarjetaMetrica valor={7} etiqueta="Pares sin responder" alerta href="/design-system" />
          <TarjetaMetrica
            valor={12}
            etiqueta="Constancias pendientes"
            alerta
            href="/design-system"
          />
          <TarjetaMetrica valor={31} etiqueta="En evaluación" />
          <TarjetaMetrica valor={23} etiqueta="Aprobados" />
        </div>
        <div className="flex flex-wrap gap-2">
          <ChipAreaTematica area="Educación inclusiva" />
          <ChipAreaTematica area="Didáctica de las ciencias" onQuitar={() => undefined} />
        </div>
      </Seccion>

      <Seccion titulo="FilaParAsignado y FilaCorreoEnviado">
        <ul className="flex flex-col gap-3">
          <FilaParAsignado
            orden={1}
            nombre="Luz Marina Burbano"
            universidad="Universidad de Nariño"
            estado="entrego"
            concepto="Publicable"
            fechaEntrega="2026-10-26"
            constanciaEmitida
          />
          <FilaParAsignado
            orden={3}
            nombre="Hernán Delgado"
            universidad="Universidad del Cauca"
            estado="acepto"
            esDesempate
            acciones={
              <Boton variante="secundario" tamano="sm">
                Reenviar invitación
              </Boton>
            }
          />
        </ul>
        <Tabla
          etiqueta="Correos de ejemplo"
          filas={['a', 'b', 'c']}
          obtenerClave={(f) => f}
          columnas={[
            { clave: 'tipo', encabezado: 'Tipo', render: () => null },
            { clave: 'dest', encabezado: 'Destinatario', render: () => null },
            { clave: 'fecha', encabezado: 'Fecha', render: () => null },
            { clave: 'res', encabezado: 'Resultado', render: () => null },
            { clave: 'acc', encabezado: 'Acción', render: () => null },
          ]}
          renderFila={(f) =>
            f === 'a' ? (
              <FilaCorreoEnviado
                key={f}
                tipo="Agradecimiento con constancia"
                destinatario="lm.burbano@udenar.edu.co"
                fechaEnvio="2026-10-26T16:02:00"
                resultado="entregado"
              />
            ) : f === 'b' ? (
              <FilaCorreoEnviado
                key={f}
                tipo="Reenvío de invitación"
                destinatario="j.rosero@umariana.edu.co"
                fechaEnvio="2026-10-14T09:41:00"
                resultado="rebotado"
                accion={
                  <Boton variante="texto" tamano="sm">
                    Corregir
                  </Boton>
                }
              />
            ) : (
              <FilaCorreoEnviado
                key={f}
                tipo="Recordatorio al par"
                destinatario="h.delgado@unicesmag.edu.co"
                fechaEnvio="2026-10-27T09:30:00"
                resultado="en-cola"
              />
            )
          }
        />
      </Seccion>

      <Seccion titulo="EncabezadoRevista (60 px, solo la barra cambia entre revistas)">
        <div className="flex flex-col gap-3">
          <EncabezadoRevista
            revista="reep"
            acciones={
              <Boton variante="neutro" tamano="sm">
                Registrar artículo
              </Boton>
            }
          />
          <EncabezadoRevista
            revista="ire"
            acciones={
              <Boton variante="neutro" tamano="sm">
                Registrar artículo
              </Boton>
            }
          />
        </div>
      </Seccion>

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
    </main>
  )
}
