import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => {
  return {
    plugins: [
      build(),
      ...(command === 'serve' ? [devServer({
        adapter,
        entry: 'src/index.tsx'
      })] : [])
    ],
    server: {
      allowedHosts: ['all'] // Allow all hosts for sandbox environment
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        external: [],
      },
    },
  }
})
