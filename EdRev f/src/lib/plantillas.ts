/*
 * plantillas — marker handling shared by the mock API and the template editor: finding the
 * {{markers}} of a text and filling them in. Unknown markers stay visible when filling, so a
 * mistake in a template is noticed in the preview instead of being silently dropped.
 * Covers: RNF-19 (templates editable without touching code), RF-25, RF-30.
 */

export function marcadores(texto: string): string[] {
  return [...texto.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? '')
}

export function rellenar(texto: string, variables: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, clave: string) => variables[clave] ?? `{{${clave}}}`)
}
