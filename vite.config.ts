import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  ssr: {
    external: ["bun"],
  },
  server: {
    host: !!process.env.PORT,
    port: Number(process.env.PORT) || 5173,
    strictPort: !!process.env.PORT,
  },
});
