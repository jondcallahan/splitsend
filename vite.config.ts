import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild, command }) => ({
  plugins: [reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: command === "build" && isSsrBuild ? true : undefined,
    external: ["@vercel/og"],
  },
  resolve: {
    alias:
      command === "build" && isSsrBuild
        ? { "@libsql/client": "@libsql/client/web" }
        : undefined,
  },

  server: {
    host: !!process.env.PORT,
    port: Number(process.env.PORT) || 5173,
    strictPort: !!process.env.PORT,
  },
}));
