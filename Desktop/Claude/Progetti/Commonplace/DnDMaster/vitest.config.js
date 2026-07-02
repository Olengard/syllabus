import { defineConfig } from "vitest/config";

// Config separata da vite.config.js: i test non hanno bisogno dei plugin
// react/PWA (esbuild gestisce già il JSX dei moduli importati).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
