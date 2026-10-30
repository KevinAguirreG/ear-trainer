import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Rutas relativas: el build funciona en la subruta de GitHub Pages y en cualquier hosting estático.
  base: './',
  // `npm run dev:https`: certificado local para probar el micrófono desde el celular.
  plugins: [react(), tailwindcss(), mode === 'https' && basicSsl()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
}))
