import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '192.168.29.44',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://192.168.29.44:5000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://192.168.29.44:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  }
});
