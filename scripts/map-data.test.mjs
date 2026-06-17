import test from "node:test";
import assert from "node:assert/strict";
import { trackToFeatureCollection } from "./map-data.mjs";

test("trackToFeatureCollection creates one line feature per track", () => {
  const fc = trackToFeatureCollection([
    {
      id: "ride.gpx",
      name: "Ride",
      segments: [
        [
          { lon: 100, lat: 30 },
          { lon: 101, lat: 31 },
        ],
      ],
    },
  ]);

  assert.equal(fc.features.length, 1);
  assert.deepEqual(fc.features[0].geometry.coordinates, [[[100, 30], [101, 31]]]);
});
