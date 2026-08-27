import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5300,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5400",
        changeOrigin: true,
      },
    },
  },
});
