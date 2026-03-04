import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group React & Router essentials
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // Group the heavy Markdown/Math libraries
            if (id.includes('react-markdown') || id.includes('rehype-katex') || id.includes('remark-math') || id.includes('katex')) {
              return 'vendor-markdown';
            }
            // Group Supabase client
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Catch-all for other dependencies
            return 'vendor';
          }
        }
      }
    }
  }
})