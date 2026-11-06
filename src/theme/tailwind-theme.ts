/*
 * Tailwind theme built on the CSS variables of ./tokens.css. No raw color values here.
 * Consumed by tailwind.config.ts.
 */
import type { Config } from 'tailwindcss'

const v = (name: string) => `var(--${name})`

export const tema: NonNullable<Config['theme']> = {
  // Scale of 4: 4, 8, 12, 16, 20, 24, 32, 40, 48
  spacing: {
    0: '0px',
    px: '1px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
  },
  borderRadius: {
    none: '0px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  boxShadow: {
    none: 'none',
    tarjeta: '0 1px 2px rgba(20,32,46,.06), 0 1px 3px rgba(20,32,46,.08)',
    elevada: '0 18px 44px rgba(8,20,51,.30)',
  },
  fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
  fontSize: {
    display: ['32px', { lineHeight: '40px', fontWeight: '700' }],
    'titulo-24': ['24px', { lineHeight: '32px', fontWeight: '700' }],
    'titulo-20': ['20px', { lineHeight: '28px', fontWeight: '600' }],
    'titulo-16': ['16px', { lineHeight: '24px', fontWeight: '600' }],
    'cuerpo-15': ['15px', { lineHeight: '24px', fontWeight: '400' }],
    'cuerpo-15-enfasis': ['15px', { lineHeight: '24px', fontWeight: '600' }],
    'cuerpo-13': ['13px', { lineHeight: '20px', fontWeight: '400' }],
    'etiqueta-13': ['13px', { lineHeight: '18px', fontWeight: '600' }],
    'micro-11': ['11px', { lineHeight: '16px', fontWeight: '600', letterSpacing: '0.04em' }],
  },
  colors: {
    transparent: 'transparent',
    current: 'currentColor',
    cesmag: {
      azul: v('cesmag-azul'),
      'azul-panel': v('cesmag-azul-panel'),
      'azul-oscuro': v('cesmag-azul-oscuro'),
      rojo: v('cesmag-rojo'),
    },
    neutro: {
      0: v('neutro-0'),
      50: v('neutro-50'),
      100: v('neutro-100'),
      200: v('neutro-200'),
      300: v('neutro-300'),
      400: v('neutro-400'),
      600: v('neutro-600'),
      800: v('neutro-800'),
      900: v('neutro-900'),
    },
    estado: {
      exito: v('estado-exito'),
      'exito-fondo': v('estado-exito-fondo'),
      alerta: v('estado-alerta'),
      'alerta-fondo': v('estado-alerta-fondo'),
      error: v('estado-error'),
      'error-fondo': v('estado-error-fondo'),
      info: v('estado-info'),
      'info-fondo': v('estado-info-fondo'),
    },
    superficie: {
      fondo: v('superficie-fondo'),
      tarjeta: v('superficie-tarjeta'),
      sutil: v('superficie-sutil'),
      inversa: v('superficie-inversa'),
    },
    texto: {
      principal: v('texto-principal'),
      secundario: v('texto-secundario'),
      tenue: v('texto-tenue'),
      inverso: v('texto-inverso'),
      enlace: v('texto-enlace'),
      placeholder: v('texto-placeholder'),
    },
    borde: {
      base: v('borde-base'),
      fuerte: v('borde-fuerte'),
      control: v('borde-control'),
      foco: v('borde-foco'),
    },
    revista: {
      primario: v('revista-primario'),
      'primario-oscuro': v('revista-primario-oscuro'),
      profundo: v('revista-profundo'),
      suave: v('revista-suave'),
      'degradado-fin': v('revista-degradado-fin'),
      pastilla: v('revista-pastilla'),
    },
    velo: { modal: v('velo-modal'), panel: v('velo-panel') },
  },
  extend: {
    // fixed layout dimensions from Figma
    width: { panel: '240px', acceso: '440px' },
    minWidth: { panel: '240px', 'control-sm': '32px' },
    maxWidth: { acceso: '440px', titulo: v('revista-titulo-ancho') },
    height: { barra: '60px', fila: '44px', control: '40px', 'control-sm': '32px' },
    minHeight: { fila: '44px', control: '40px', 'control-sm': '32px' },
    backgroundImage: {
      'revista-barra': v('revista-barra'),
      'revista-velo': v('revista-velo'),
    },
  },
}
