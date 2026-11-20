/*
 * marcoCorreo — el marco institucional de todos los correos que envía el sistema (invitación, agradecimiento,
 * constancia): el encabezado de la Universidad CESMAG con su lema, una franja azul con la dependencia y el mes,
 * el título del mensaje, el texto de la plantilla, el bloque de contacto y los avisos de confidencialidad y de
 * datos personales. Se arma con tablas y estilos en línea, que es lo que leen los clientes de correo.
 * El escudo es una imagen: en los correos reales sale de LOGO_CORREO_URL (la dirección que la universidad
 * publica en su sitio), así se ve en cualquier cliente; sin ella el encabezado es el nombre de la universidad
 * en letras. Las vistas previas de la página lo llevan incrustado, sin depender de la red.
 */
import { readFileSync } from 'node:fs'
import { config } from '../config.js'

const AZUL = '#0f4a8a'
const ROJO = '#c00000'
const GRIS = '#555555'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TITULOS = {
  invitacion: 'Invitación a evaluar un artículo',
  agradecimiento: 'Gracias por su evaluación',
  constancia: 'Constancia de participación',
  // Correos de la cuenta (no son de una evaluación): el enlace para definir la contraseña.
  // Mensaje que la dependencia escribe a mano a un par o a un autor (el asunto va en el asunto del correo).
  mensaje: 'Mensaje de la Dependencia de Editorial',
  activacion: 'Active su cuenta',
  recuperacion: 'Recupere su contraseña',
} as const

export type TipoMarco = keyof typeof TITULOS

/**
 * Si la dirección de la API se puede alcanzar desde fuera de este computador (para que un cliente de correo
 * pueda cargar imágenes).
 */
export function apiPublica(url = config.urlApiPublica): boolean {
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:') return false
    return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0)/.test(hostname) && !hostname.endsWith('.local')
  } catch {
    return false
  }
}

/** Dirección del escudo para un correo real: la de la universidad o, si no hay, la de la API cuando es pública. */
export function enlaceEscudo(): string | null {
  if (config.urlLogoCorreo) return config.urlLogoCorreo
  return apiPublica() ? `${config.urlApiPublica}/api/imagenes/escudo` : null
}

/** El escudo como dirección de datos, para las vistas previas en pantalla (no necesita red). */
export function escudoEmbebido(): string {
  const png = readFileSync(new URL('../../assets/escudo-cesmag.png', import.meta.url))
  return `data:image/png;base64,${png.toString('base64')}`
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface DatosMarco {
  tipo: TipoMarco
  /** Nombre de la revista, tal como la dependencia lo muestra en la franja. */
  revista: string
  /** Dirección desde la que sale el correo; también donde el par puede escribir. */
  contacto: string
  /** El texto de la plantilla ya como HTML (con los botones, si los tiene). */
  contenido: string
  fecha?: Date
  /** Origen del escudo; por defecto el de un correo real. Las vistas previas pasan el incrustado. */
  escudo?: string | null
}

export function marcoInstitucional(d: DatosMarco): string {
  const fecha = d.fecha ?? new Date()
  const mes = `${MESES[fecha.getMonth()]} / ${fecha.getFullYear()}`
  const origen = d.escudo === undefined ? enlaceEscudo() : d.escudo
  const escudo = origen
    ? `<img src="${origen}" width="92" height="92" alt="Universidad CESMAG" style="display:block;border:0">`
    : ''
  const nombre = `<span style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:4px;color:${AZUL};display:block">UNIVERSIDAD</span><span style="font-family:Arial,sans-serif;font-size:34px;font-weight:bold;color:${AZUL};line-height:36px;display:block">CESMAG</span>`
  const celda = 'font-family:Arial,Helvetica,sans-serif'

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(TITULOS[d.tipo])}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff">
    <tr><td style="padding:24px 28px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
        ${escudo ? `<td width="104" valign="middle">${escudo}</td>` : ''}
        <td valign="middle">${nombre}</td>
        <td valign="middle" align="right" style="${celda};font-size:11px;letter-spacing:3px;color:${GRIS}">HOMBRES NUEVOS<br>PARA TIEMPOS NUEVOS</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${AZUL};padding:22px 28px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
        <td valign="middle" style="${celda};font-size:16px;font-style:italic;color:#ffffff">Dependencia de Editorial</td>
        <td valign="middle" align="right" width="170"><span style="${celda};display:inline-block;background:#ffffff;color:${ROJO};font-size:15px;padding:10px 18px;border-radius:22px 0 0 22px">${mes}</span></td>
      </tr></table>
    </td></tr>
    <tr><td align="center" style="padding:30px 36px 6px">
      <div style="${celda};font-size:26px;font-weight:bold;color:${AZUL};line-height:32px">${esc(TITULOS[d.tipo])}</div>
      <div style="${celda};font-size:15px;color:${ROJO};padding-top:6px">${esc(d.revista)}</div>
    </td></tr>
    <tr><td style="${celda};font-size:15px;line-height:23px;color:#222222;padding:18px 36px 10px">
      ${d.contenido}
    </td></tr>
    <tr><td style="padding:10px 36px 0"><div style="border-top:1px solid #dddddd"></div></td></tr>
    <tr><td style="${celda};font-size:14px;line-height:21px;color:#222222;padding:18px 36px 6px">
      <div style="font-size:17px;padding-bottom:8px">Contacto <strong>Dependencia de Editorial</strong></div>
      Campus Centro · Carrera 20 A No. 14-54<br>San Juan de Pasto, Nariño<br>
      <a href="mailto:${esc(d.contacto)}" style="color:#1155cc">${esc(d.contacto)}</a>
    </td></tr>
    <tr><td align="right" style="${celda};font-size:12px;color:${AZUL};padding:6px 36px 4px">* VIGILADA MINEDUCACIÓN</td></tr>
    <tr><td style="padding:10px 36px 26px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
        <td style="${celda};font-size:15px;letter-spacing:4px;color:${AZUL}">#SomosUNICESMAG</td>
        <td align="right" style="${celda};font-size:13px"><a href="https://www.unicesmag.edu.co" style="color:${AZUL};font-style:italic">www.unicesmag.edu.co</a></td>
      </tr></table>
    </td></tr>
  </table>
  <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px"><tr><td align="center" style="${celda};font-size:12px;line-height:19px;color:#333333;padding:20px 16px 8px">
    La información enviada en este mensaje electrónico es confidencial y solo para uso de la persona/compañía identificada en el mismo. Si el receptor de este mensaje no es la persona de destino mencionada, cualquier divulgación, distribución y/o copia de la información contenida en este mensaje electrónico, se encuentra estrictamente prohibida. Si usted recibe este mensaje por error, por favor notifique al emisor del mismo de inmediato.
    <br><br>Este es un mensaje informativo del Sistema de Gestión Editorial. Si requiere más información sobre su contenido, escriba a <a href="mailto:${esc(d.contacto)}" style="color:#1155cc">${esc(d.contacto)}</a> o visite nuestra página web <a href="https://www.unicesmag.edu.co" style="color:#1155cc">www.unicesmag.edu.co</a>.
  </td></tr>
  <tr><td style="${celda};font-size:10px;line-height:16px;color:#444444;padding:16px 16px 24px;border-top:1px dotted #999999">
    En la Universidad CESMAG, tratamos sus datos personales conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015. El tratamiento de sus datos incluye la recolección, almacenamiento, uso, circulación y supresión de la información. La finalidad de este tratamiento comprende, pero no se limita a gestión de procesos académicos, financieros, administrativos, de investigación, proyección social y de recursos humanos, desarrollo de programas de bienestar y desarrollo estudiantil, seguridad y control de acceso, cumplimiento de obligaciones legales. En algunos casos, podríamos solicitar datos personales sensibles. Usted tiene derecho a conocer, actualizar, rectificar y suprimir sus datos personales, así como a revocar la autorización otorgada para su tratamiento en los términos de la normativa vigente. Para más información sobre nuestras políticas de tratamiento de datos personales y sus cambios sustanciales, visite el siguiente link: <a href="https://www.unicesmag.edu.co/documentos/DATOS-UNICESMAG.pdf" style="color:#1155cc">https://www.unicesmag.edu.co/documentos/DATOS-UNICESMAG.pdf</a>. Para ejercer estos derechos o si tiene alguna pregunta sobre este aviso de privacidad o sobre el tratamiento de sus datos personales, por favor contáctenos a través del correo <a href="mailto:correspondencia@unicesmag.edu.co" style="color:#1155cc">correspondencia@unicesmag.edu.co</a>, o presencialmente en las instalaciones de la UNIVERSIDAD CESMAG (Campus Centro) ubicada en la Carrera 20 A No. 14-54 de la ciudad de Pasto.
  </td></tr>
  </table>
</td></tr></table>
</body></html>`
}
