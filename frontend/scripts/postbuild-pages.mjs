#!/usr/bin/env node
/**
 * GitHub Pages SPA fallback: serve index.html for unknown paths
 * by copying it to 404.html in dist.
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const index = join(dist, "index.html");
const notFound = join(dist, "404.html");

if (!existsSync(index)) {
  console.error("postbuild: dist/index.html missing; run vite build first");
  process.exit(1);
}
copyFileSync(index, notFound);
console.log("postbuild: wrote dist/404.html (SPA fallback for GitHub Pages)");
