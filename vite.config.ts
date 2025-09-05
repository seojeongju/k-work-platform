import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

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
    plugins
  }
})
