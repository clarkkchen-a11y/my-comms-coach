import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600, // LiveKit is lazy-loaded; suppress expected large chunk warning
    rollupOptions: {
      output: {
        // Split heavy LiveKit bundle into its own chunk (lazy-loaded on session start)
        manualChunks(id) {
          if (id.includes('@livekit/components-react') || id.includes('@livekit/components-core')) {
            return 'livekit';
          }
        },
      },
    },
  },
})
