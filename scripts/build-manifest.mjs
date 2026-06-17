#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTrackBundle, parseGpxToBundleTrack } from "./track-bundle.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const gpxDir = join(root, "public", "gpx");
const outFile = join(gpxDir, "index.json");
const bundleDir = join(root, "public", "tracks");
const bundleFile = join(bundleDir, "bundle.json");

if (!existsSync(gpxDir)) {
  mkdirSync(gpxDir, { recursive: true });
}

const files = readdirSync(gpxDir)
  .filter((f) => f.toLowerCase().endsWith(".gpx"))
  .sort();

writeFileSync(outFile, JSON.stringify({ files }, null, 2) + "\n");
console.log(`[build-manifest] wrote ${files.length} GPX entries -> public/gpx/index.json`);

mkdirSync(bundleDir, { recursive: true });

const tracks = files.map((file) => {
  const xml = readFileSync(join(gpxDir, file), "utf8");
  return parseGpxToBundleTrack(xml, file, { simplifyToleranceMeters: 25 });
});
const bundle = buildTrackBundle(tracks);

writeFileSync(bundleFile, JSON.stringify(bundle));
console.log(
  `[build-manifest] wrote ${bundle.stats.pointCount}/${bundle.stats.originalPointCount} points -> public/tracks/bundle.json`
);
