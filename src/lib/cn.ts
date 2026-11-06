/** Joins class names, ignoring falsy values. */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ')
}
