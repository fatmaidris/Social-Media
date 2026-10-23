import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const githubPagesFallback = {
  name: "github-pages-spa-fallback",
  apply: "build",
  writeBundle({ dir }) {
    const outputDirectory = resolve(dir ?? "dist");
    copyFileSync(
      resolve(outputDirectory, "index.html"),
      resolve(outputDirectory, "404.html"),
    );
  },
};

export default defineConfig({
  base: "/social-media-project/",
  plugins: [react(), githubPagesFallback],
});
