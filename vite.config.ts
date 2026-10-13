/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import {
  resolveEnvironment,
  proxyPaths,
  apiPattern,
  PWA_CACHE,
} from "./src/config/environment";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// English: Minimal structural types for Workbox match callbacks.
type AssetCtx = { request: Request };
type ImageCtx = { request: Request };

// English: Helper to derive vendor chunk names from node_modules path.
function pkgName(id: string): string | null {
  const m = id.match(/node_modules\/(@[^/]+\/)?([^/]+)/);
  return m ? (m[1] ? `${m[1]}${m[2]}` : m[2]) : null;
}

export default defineConfig(({ mode }) => {
  const settings = resolveEnvironment(loadEnv(mode, process.cwd(), "VITE_"));
  const apiMatch = apiPattern(settings.apiBase);
  const paths = proxyPaths(settings.apiBase);
  const proxy =
    settings.proxyTarget && !/^https?:\/\//.test(settings.apiBase)
      ? Object.fromEntries(
          paths.map((path) => [
            path,
            {
              target: settings.proxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (path: string) =>
                settings.apiBase ? path.slice(settings.apiBase.length) : path,
            },
          ]),
        )
      : undefined;
  return {
    base: "/",
    plugins: [
      react(),
      tailwind(),
      VitePWA({
        disable: !settings.pwaEnabled,
        registerType: "autoUpdate",
        includeAssets: [
          "icons/icon-192.png",
          "icons/icon-512.png",
          "icons/maskable-512.png",
        ],
        manifest: {
          name: "SkillBridge",
          short_name: "SkillBridge",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#0ea5e9",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // English: Precache only reasonable files; big ones are loaded at runtime.
          globIgnores: PWA_CACHE.precacheGlobIgnores,
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: paths.map(
            (path) => new RegExp("^" + path + "(?:/|[?]|$)"),
          ),
          runtimeCaching: [
            // Live responses are never cached; outages must reach the UI.
            {
              urlPattern: apiMatch,
              handler: "NetworkOnly",
              method: "GET",
            },
            {
              urlPattern: apiMatch,
              handler: "NetworkOnly",
              method: "POST",
            },
            {
              // English: JS/CSS → StaleWhileRevalidate.
              urlPattern: ({ request }: AssetCtx): boolean =>
                request.destination === "script" ||
                request.destination === "style",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: PWA_CACHE.staticName,
                expiration: {
                  maxEntries: PWA_CACHE.maxEntries,
                  maxAgeSeconds: PWA_CACHE.maxAgeSeconds,
                },
              },
            },
            {
              // English: Images → CacheFirst.
              urlPattern: ({ request }: ImageCtx): boolean =>
                request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: PWA_CACHE.imagesName,
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: PWA_CACHE.maxAgeSeconds,
                },
              },
            },
            {
              // English: Load big Insight chunk on demand, then cache.
              urlPattern: /assets\/(Insight|insight)-.*\.js$/,
              handler: "CacheFirst",
              options: {
                cacheName: PWA_CACHE.bigChunksName,
                expiration: {
                  maxEntries: PWA_CACHE.bigChunksMaxEntries,
                  maxAgeSeconds: 30 * 24 * 60 * 60,
                },
              },
            },
          ],
          navigateFallback: PWA_CACHE.navigateFallback,
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // English: Stable names help caching.
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
          // English: Split heavy deps and internal feature "insight".
          manualChunks(id) {
            if (id.includes("node_modules")) {
              const name = pkgName(id);
              if (!name) return "vendor";
              if (["react", "react-dom", "scheduler"].includes(name))
                return "react";
              if (name.startsWith("@tanstack/")) return "tanstack";
              if (name === "@reduxjs/toolkit" || name === "react-redux")
                return "redux";
              if (name === "antd" || name === "@ant-design/icons")
                return "antd";
              if (name === "maplibre-gl") return "maplibre";
              if (name === "recharts") return "recharts";
              if (name === "zod") return "zod";
              if (name === "lodash" || name === "lodash-es") return "lodash";
              if (name === "dayjs") return "dayjs";
              return "vendor";
            }
            // English: all code under this folder becomes the 'insight' chunk.
            if (id.includes("/src/features/insight/")) return "insight";
            return undefined;
          },
        },
      },
    },
    server: { proxy },
    preview: { proxy },
  };
});
