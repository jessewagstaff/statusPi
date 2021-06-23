import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      isProduction: false
    }),
  ],
  server: {
    host: true,
  },
});
