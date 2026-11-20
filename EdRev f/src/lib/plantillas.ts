/*
 * plantillas — manejo de marcas que comparten la API simulada y el editor de plantillas: encontrar las
 * {{marcas}} de un texto y rellenarlas. Las marcas desconocidas quedan visibles al rellenar, para que un error
 * en una plantilla se note en la vista previa en lugar de desaparecer sin avisar.
 */

export function marcadores(texto: string): string[] {
  return [...texto.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? '')
}

export function rellenar(texto: string, variables: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => variables[clave] ?? `{{${clave}}}`)
}
