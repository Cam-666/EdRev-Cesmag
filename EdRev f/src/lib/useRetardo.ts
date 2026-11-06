import { useEffect, useState } from 'react'

/** Returns `valor` only after it stopped changing for `ms` (to avoid a request per keystroke). */
export function useRetardo<T>(valor: T, ms = 300): T {
  const [retardado, setRetardado] = useState(valor)
  useEffect(() => {
    const id = window.setTimeout(() => setRetardado(valor), ms)
    return () => window.clearTimeout(id)
  }, [valor, ms])
  return retardado
}
