import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"
import { sockjsPolyfill } from "./vitePlugin"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sockjsPolyfill()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  define: {
    // Manually providing global objects needed by SockJS
    global: 'window',
  }
})
