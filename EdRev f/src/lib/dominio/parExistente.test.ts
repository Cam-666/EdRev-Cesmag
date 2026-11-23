import { avisoParExistente, buscarParExistente, claveTexto } from './parExistente'

const pares = [
  { nombre: 'María Camila Mendoza', correo: 'camila@uni.co', bloqueo: null },
  {
    nombre: 'Jenny Mera',
    correo: 'jenny@uni.co',
    bloqueo: { motivo: 'no-desea' as const, fecha: '2026-11-10' },
  },
]

describe('peer already in the system', () => {
  it('finds it by e-mail or by name, ignoring case and accents', () => {
    expect(buscarParExistente(pares, 'Otro Nombre', 'CAMILA@uni.co')?.nombre).toBe(
      'María Camila Mendoza',
    )
    expect(buscarParExistente(pares, 'maria  camila mendoza', 'nuevo@uni.co')?.nombre).toBe(
      'María Camila Mendoza',
    )
    expect(buscarParExistente(pares, 'Alguien Distinto', 'nuevo@uni.co')).toBeUndefined()
  })

  it('says that the peer is already registered, and that it is blocked when so', () => {
    expect(avisoParExistente(pares[0] as (typeof pares)[number])).toContain(
      'ya se encuentra registrado',
    )
    const bloqueado = avisoParExistente(pares[1] as (typeof pares)[number])
    expect(bloqueado).toContain('ya se encuentra en el sistema y está bloqueado')
    expect(bloqueado).toContain('desbloquéelo')
  })

  it('compares texts without case or accents (CESMAG = Cesmag)', () => {
    expect(claveTexto(' CESMAG ')).toBe(claveTexto('Cesmag'))
    expect(claveTexto('Educación')).toBe(claveTexto('educacion'))
  })
})
