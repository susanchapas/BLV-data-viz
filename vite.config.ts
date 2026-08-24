import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find(
        c => c.type === 'asset' && c.fileName.endsWith('.html'),
      )
      if (!html || html.type !== 'asset') return

      const cssFiles = Object.values(bundle).filter(
        c => c.type === 'asset' && c.fileName.endsWith('.css'),
      )
      if (!cssFiles.length) return

      let source = typeof html.source === 'string' ? html.source : new TextDecoder().decode(html.source)
      for (const css of cssFiles) {
        if (css.type !== 'asset') continue
        const cssContent = typeof css.source === 'string' ? css.source : new TextDecoder().decode(css.source)
        const linkPattern = new RegExp(
          `<link[^>]*href="[^"]*${css.fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`,
        )
        source = source.replace(linkPattern, `<style>${cssContent}</style>`)
        delete bundle[css.fileName]
      }
      html.source = source
    },
  }
}

export default defineConfig({
  base: '/BLV-data-viz/',
  plugins: [react(), tailwindcss(), inlineCss()],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    modulePreload: {
      resolveDependencies: (_filename, deps) =>
        deps.filter(d => !d.includes('charts-vendor')),
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react'
          if (id.includes('node_modules/react-router')) return 'router'
          if (id.includes('node_modules/@visx') || id.includes('node_modules/d3-')) return 'charts-vendor'
          if (id.includes('node_modules/framer-motion')) return 'motion'
        },
      },
    },
  },
})
