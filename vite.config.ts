import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'
import './polyfills.js'

export default defineConfig(({ command }) => {
  const plugins = [build()]
  
  // Only add dev server in development
  if (command === 'serve') {
    plugins.push(devServer({
      adapter,
      entry: 'src/index.tsx'
    }))
  }
  
  return {
    plugins,
    define: {
      // Provide polyfills for Web APIs not available in Node.js build environment
      global: 'globalThis',
    },
    build: {
      target: 'esnext',
      minify: false, // Disable minification to avoid issues during build
      rollupOptions: {
        external: [],
      },
    },
    esbuild: {
      target: 'esnext',
    },
    optimizeDeps: {
      exclude: ['@hono/vite-build', '@hono/vite-dev-server'],
    },
  }
})
