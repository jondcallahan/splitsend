import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild, command }) => ({
  plugins: [reactRouter(), tsconfigPaths()],
  ssr: {
    external: ["bun"],
  },
  resolve: {
    // In production SSR builds, alias @libsql/client to the web-only version
    // to avoid bundling native libsql bindings (not available on Vercel).
    // Local dev uses the full client which supports file: and :memory: URLs.
    alias:
      isSsrBuild && command === "build"
        ? { "@libsql/client": "@libsql/client/web" }
        : undefined,
  },
  server: {
    host: !!process.env.PORT,
    port: Number(process.env.PORT) || 5173,
    strictPort: !!process.env.PORT,
  },
}));
