import test from "node:test";
import assert from "node:assert/strict";
import { buildTrackBundle } from "./track-bundle.mjs";

test("buildTrackBundle reports one progress day per track", () => {
  const bundle = buildTrackBundle([
    {
      id: "day-1.gpx",
      name: "Day 1",
      segments: [],
      distanceKm: 10,
      elevGainM: 100,
      dateKeys: ["2026-04-01"],
      originalPointCount: 0,
      pointCount: 0,
    },
    {
      id: "day-2.gpx",
      name: "Day 2",
      segments: [],
      distanceKm: 20,
      elevGainM: 200,
      dateKeys: ["2026-04-01"],
      originalPointCount: 0,
      pointCount: 0,
    },
  ]);

  assert.equal(bundle.stats.trackDays, 2);
});
