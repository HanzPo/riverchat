import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // Enable source maps for production debugging
    sourcemap: true,
    
    // Increase chunk size warning limit (optional, but helps with large deps like Firebase)
    chunkSizeWarningLimit: 600,
    
    rollupOptions: {
      output: {
        // Manual chunks for better code splitting
        manualChunks: {
          // Separate Vue and Vue Flow into their own chunks
          'vue-vendor': ['vue'],
          'vue-flow': [
            '@vue-flow/core',
            '@vue-flow/background',
            '@vue-flow/controls',
            '@vue-flow/minimap'
          ],
          // Firebase gets its own chunk (it's large)
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // UI libraries
          'ui-libs': ['lucide-vue-next', 'marked', 'dompurify'],
          // Utilities
          'utils': ['uuid', 'crypto-js']
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for now, set to true for production
        drop_debugger: true,
        pure_funcs: ['console.debug'] // Remove console.debug
      }
    }
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'vue',
      '@vue-flow/core',
      '@vue-flow/background',
      '@vue-flow/controls',
      '@vue-flow/minimap',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'lucide-vue-next',
      'marked',
      'dompurify',
      'uuid',
      'crypto-js'
    ]
  }
})
