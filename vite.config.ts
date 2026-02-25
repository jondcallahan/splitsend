import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ isSsrBuild, command }) => ({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
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

  ssr: {
    external: ["@vercel/og"],
    noExternal: command === "build" && isSsrBuild ? true : undefined,
  },
}));
