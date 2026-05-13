import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

function redirectMissingBaseSlash() {
  return {
    name: 'redirect-missing-base-slash',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/mundo2026v1?')) {
          res.statusCode = 307
          res.setHeader('Location', req.url.replace('/mundo2026v1?', '/mundo2026v1/?'))
          res.end()
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: '/mundo2026v1/',
  plugins: [redirectMissingBaseSlash(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
