#!/usr/bin/env node
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const gpxDir = join(root, "public", "gpx");
const outFile = join(gpxDir, "index.json");

if (!existsSync(gpxDir)) {
  mkdirSync(gpxDir, { recursive: true });
}

const files = readdirSync(gpxDir)
  .filter((f) => f.toLowerCase().endsWith(".gpx"))
  .sort();

writeFileSync(outFile, JSON.stringify({ files }, null, 2) + "\n");

console.log(`[build-manifest] wrote ${files.length} GPX entries → public/gpx/index.json`);
