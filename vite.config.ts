import { defineConfig } from "vite";

// root を app に固定。build/preview ともこの設定を使う。
export default defineConfig({
  root: "app",
  build: { outDir: "dist", emptyOutDir: true },
});
