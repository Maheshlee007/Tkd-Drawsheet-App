import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    runtimeErrorOverlay(),
    themePlugin(),],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server:{
    port: 3000,
    host: true,
    open: true,
  },
  // root: path.resolve(__dirname, "."),
  // build: {
  //   outDir: path.resolve(__dirname, "dist/public"),
  //   emptyOutDir: true,
  // },
})
