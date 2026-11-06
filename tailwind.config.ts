import type { Config } from 'tailwindcss'
import { tema } from './src/theme/tailwind-theme'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: tema,
  plugins: [],
}

export default config
