import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icon.png", "robots.txt"],
      manifest: {
        id: "/",
        name: "BetAdda - Play Smart, Win Big",
        short_name: "BetAdda",
        description: "Trusted gaming platform with wallet, tournaments, rewards and fast withdrawals.",
        theme_color: "#f59e0b",
        background_color: "#0a0614",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/dashboard",
        icons: [
          {
            src: "/logo.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        // Cache all JS/CSS chunks
        globPatterns: ["**/*.{js,css,html,png,woff2}"],
        // Cache Firebase API calls
       runtimeCaching: [
    {
      urlPattern: ({ url }) => {
      return (
        url.origin === 'https://firestore.googleapis.com' &&
        !url.pathname.includes('/Listen/') &&
        !url.pathname.includes('/channel')
      );
    },
    handler: "NetworkFirst",
    method: "GET",
    options: {
      cacheName: "firebase-firestore-cache",
      expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      cacheableResponse: { statuses: [0, 200] },
      networkTimeoutSeconds: 10,
    },
  },
],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "firebase-app": ["firebase/app"],
          "firebase-auth": ["firebase/auth"],
          "firebase-firestore": ["firebase/firestore"],
          "framer": ["framer-motion"],
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-avatar",
            "@radix-ui/react-progress",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          "query": ["@tanstack/react-query"],
          "forms": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
});
