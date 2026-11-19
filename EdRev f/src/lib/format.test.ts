import { formatearFechaHora } from './format'

describe('date and time on a 12-hour clock', () => {
  it('writes the afternoon with p. m. and the morning with a. m.', () => {
    expect(formatearFechaHora('2026-10-26T16:02:00')).toBe('26 oct · 4:02 p. m.')
    expect(formatearFechaHora('2026-10-26T09:05:00')).toBe('26 oct · 9:05 a. m.')
    expect(formatearFechaHora('2026-10-26T00:30:00')).toBe('26 oct · 12:30 a. m.')
    expect(formatearFechaHora('2026-10-26T12:00:00')).toBe('26 oct · 12:00 p. m.')
  })
})
