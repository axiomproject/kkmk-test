import { defineConfig, ConfigEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL,
        changeOrigin: true,
        secure: false
      }
    }
  },
  define: {
    'process.env': {}
  },
  build: {
    outDir: 'dist',
    sourcemap: mode === 'development',
    // Ignore TypeScript errors during build
    typescript: {
      ignoreBuildErrors: true
    },
    // Add Rollup options to suppress Circular Dependency warnings
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') {
          return;
        }
        defaultHandler(warning);
      }
    }
  }
}))