import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
    // In dev the client (5173) talks to the server (3000) through these proxies.
    // /socket.io must upgrade to websockets; /api is plain HTTP (health, endpoints).
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
      '/api': 'http://localhost:3000',
    },
  },
});
