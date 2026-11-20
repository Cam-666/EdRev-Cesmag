import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./pruebas/baseDePrueba.ts'],
    setupFiles: ['./pruebas/entorno.ts'],
    include: ['pruebas/**/*.test.ts'],
    // Una sola base de datos para todos los archivos: se ejecutan uno después del otro.
    fileParallelism: false,
    testTimeout: 20000,
  },
})
