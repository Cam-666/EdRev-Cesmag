import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['./pruebas/baseDePrueba.ts'],
    setupFiles: ['./pruebas/entorno.ts'],
    include: ['pruebas/**/*.test.ts'],
    // One database for all files: run them one after the other.
    fileParallelism: false,
    testTimeout: 20000,
  },
})
