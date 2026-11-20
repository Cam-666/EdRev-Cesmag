import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Separa el código de terceros en paquetes estables (mejor caché, sin la advertencia de 500 kB).
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[/](react|react-dom|react-router|react-router-dom|scheduler)[/]/,
            },
            { name: 'vendor-radix', test: /node_modules[/]@radix-ui[/]/ },
            { name: 'vendor-forms', test: /node_modules[/](react-hook-form|@hookform|zod)[/]/ },
            { name: 'vendor-data', test: /node_modules[/](@tanstack|date-fns)[/]/ },
          ],
        },
      },
    },
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    testTimeout: 15000,
    // Las pruebas siempre corren contra la API simulada, sin importar lo que diga .env.local para desarrollo.
    env: { VITE_USE_MOCKS: 'true', VITE_API_URL: 'http://localhost/api' },
  },
})
