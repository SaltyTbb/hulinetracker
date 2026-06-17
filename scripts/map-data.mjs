export function trackToFeatureCollection(tracks) {
  return {
    type: "FeatureCollection",
    features: tracks.map((track) => ({
      type: "Feature",
      properties: { id: track.id, name: track.name },
      geometry: {
        type: "MultiLineString",
        coordinates: track.segments.map((seg) => seg.map((p) => [p.lon, p.lat])),
      },
    })),
  };
}
