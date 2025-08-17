import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',              // site servi depuis la racine du domaine
  build: { 
    outDir: 'dist',
    assetsDir: 'assets'   // JS/CSS/images iront dans /assets
  },
})
