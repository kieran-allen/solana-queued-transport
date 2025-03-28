import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: ["./src/index.ts"],
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["@solana/kit"],
    },
  },
  plugins: [dts()],
});
