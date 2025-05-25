import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "index": "./tinkerable-internal/src/index.ts",
      "v1": "./tinkerable-internal/src/v1/index.ts"
    },
    treeshake: true,
    minify: true,
    verbose: true,
    tsconfig: "./tsup.tsconfig.json",
    dts: true,
    external: ["react", "react-dom", "react-router", "@chakra-ui/react"],
    clean: true,
    outDir: "./static/tinkerable-internal",
  },
]);
