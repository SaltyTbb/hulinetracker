import test from "node:test";
import assert from "node:assert/strict";
import { parseGpxToBundleTrack, simplifySegment } from "./track-bundle.mjs";

test("simplifySegment keeps endpoints and removes points closer than the tolerance", () => {
  const segment = [
    [100, 30],
    [100.00001, 30.00001],
    [100.01, 30.01],
  ];

  assert.deepEqual(simplifySegment(segment, 10), [
    [100, 30],
    [100.01, 30.01],
  ]);
});

test("parseGpxToBundleTrack extracts compact geometry and original stats", () => {
  const xml = `<?xml version="1.0"?>
<gpx>
  <metadata><time>2026-01-02T00:00:00Z</time></metadata>
  <trk>
    <name>Morning Ride</name>
    <trkseg>
      <trkpt lat="30" lon="100"><ele>10</ele><time>2026-01-02T00:00:00Z</time></trkpt>
      <trkpt lat="30.00001" lon="100.00001"><ele>11</ele><time>2026-01-02T00:00:10Z</time></trkpt>
      <trkpt lat="30.01" lon="100.01"><ele>20</ele><time>2026-01-02T00:10:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

  const track = parseGpxToBundleTrack(xml, "ride.gpx", { simplifyToleranceMeters: 10 });

  assert.equal(track.id, "ride.gpx");
  assert.equal(track.name, "Morning Ride");
  assert.equal(track.metadataTime, "2026-01-02T00:00:00.000Z");
  assert.deepEqual(track.dateKeys, ["2026-01-02"]);
  assert.equal(track.originalPointCount, 3);
  assert.equal(track.pointCount, 2);
  assert.equal(track.segments.length, 1);
  assert.ok(track.distanceKm > 1.4);
  assert.ok(track.elevGainM >= 10);
});
