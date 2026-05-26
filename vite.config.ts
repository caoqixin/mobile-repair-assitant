import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",

      // 自动更新 SW
      injectRegister: "auto",

      // PWA dev 模式
      devOptions: {
        enabled: true,
        type: "module",
      },
      // 需要缓存的静态资源
      includeAssets: ["favicon.ico"],

      manifest: {
        id: "/",
        name: "店铺库存极速快查后台",
        short_name: "库存快查",

        description: "专为手机端优化的轻量级店铺库存查询与管理后台",

        theme_color: "#4f46e5",
        background_color: "#ffffff",

        display: "standalone",

        // 安卓更像原生 APP
        display_override: [
          "standalone",
          "minimal-ui",
          "window-controls-overlay",
        ],
        orientation: "portrait",

        start_url: "/",

        scope: "/",

        lang: "zh-CN",

        categories: ["business", "productivity", "utilities"],

        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable", // 适配部分安卓手机的裁剪图标机制
          },
        ],
      },

      // 针对 Supabase API 请求的 runtime 缓存策略（可选）
      workbox: {
        cleanupOutdatedCaches: true,

        clientsClaim: true,
        skipWaiting: true,

        navigateFallback: "/index.html",

        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          /**
           * 静态资源
           */
          {
            urlPattern: ({ request }) =>
              request.destination === "style" ||
              request.destination === "script" ||
              request.destination === "worker",

            handler: "StaleWhileRevalidate",

            options: {
              cacheName: "assets-cache",

              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          /**
           * Supabase REST API
           */
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,

            handler: "NetworkFirst",

            options: {
              cacheName: "supabase-rest-cache",

              networkTimeoutSeconds: 3,

              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5,
              },

              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          /**
           * Google Fonts
           */
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,

            handler: "CacheFirst",

            options: {
              cacheName: "google-fonts",

              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@supabase")) {
              return "supabase";
            }

            if (id.includes("react") || id.includes("react-dom")) {
              return "vendor";
            }

            return "libs";
          }
        },
      },
    },
  },
});
