const EARTH_RADIUS_M = 6371008.8;
const ELEV_GAIN_THRESHOLD_M = 3;

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineMeters(a, b) {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function dateKey(isoText) {
  const d = new Date(isoText);
  if (Number.isNaN(d.getTime())) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function firstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? decodeXml(match[1].trim()) : undefined;
}

function decodeXml(text) {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function roundCoord(value) {
  return Number(value.toFixed(6));
}

function distancePointToLineMeters(point, start, end) {
  const lineLen = haversineMeters(start, end);
  if (lineLen === 0) return haversineMeters(point, start);

  const meanLat = toRad((start[1] + end[1] + point[1]) / 3);
  const x1 = toRad(start[0]) * Math.cos(meanLat) * EARTH_RADIUS_M;
  const y1 = toRad(start[1]) * EARTH_RADIUS_M;
  const x2 = toRad(end[0]) * Math.cos(meanLat) * EARTH_RADIUS_M;
  const y2 = toRad(end[1]) * EARTH_RADIUS_M;
  const x0 = toRad(point[0]) * Math.cos(meanLat) * EARTH_RADIUS_M;
  const y0 = toRad(point[1]) * EARTH_RADIUS_M;

  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x0 - x1, y0 - y1);

  const t = Math.max(0, Math.min(1, ((x0 - x1) * dx + (y0 - y1) * dy) / (dx * dx + dy * dy)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(x0 - projX, y0 - projY);
}

function douglasPeucker(points, toleranceMeters) {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = distancePointToLineMeters(points[i], start, end);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance <= toleranceMeters) return [start, end];

  const left = douglasPeucker(points.slice(0, index + 1), toleranceMeters);
  const right = douglasPeucker(points.slice(index), toleranceMeters);
  return [...left.slice(0, -1), ...right];
}

export function simplifySegment(segment, toleranceMeters) {
  if (segment.length <= 2 || toleranceMeters <= 0) return segment;
  return douglasPeucker(segment, toleranceMeters);
}

function parseTrackPoints(segmentXml) {
  const points = [];
  const pointPattern = /<[^:\s>]*(?::)?trkpt\b([^>]*)>([\s\S]*?)<\/[^:\s>]*(?::)?trkpt>/gi;
  let match;

  while ((match = pointPattern.exec(segmentXml))) {
    const attrs = match[1];
    const body = match[2];
    const latText = firstMatch(attrs, /\blat=["']([^"']+)["']/i);
    const lonText = firstMatch(attrs, /\blon=["']([^"']+)["']/i);
    const lat = Number.parseFloat(latText ?? "");
    const lon = Number.parseFloat(lonText ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const eleText = firstMatch(body, /<[^:\s>]*(?::)?ele\b[^>]*>([\s\S]*?)<\/[^:\s>]*(?::)?ele>/i);
    const timeText = firstMatch(body, /<[^:\s>]*(?::)?time\b[^>]*>([\s\S]*?)<\/[^:\s>]*(?::)?time>/i);
    const ele = eleText === undefined ? undefined : Number.parseFloat(eleText);

    points.push({
      coord: [roundCoord(lon), roundCoord(lat)],
      ele: Number.isFinite(ele) ? ele : undefined,
      time: timeText,
    });
  }

  return points;
}

function segmentElevGain(points) {
  let gain = 0;
  let anchor;
  for (const point of points) {
    const ele = point.ele;
    if (typeof ele !== "number" || !Number.isFinite(ele)) continue;
    if (anchor === undefined) {
      anchor = ele;
      continue;
    }
    const delta = ele - anchor;
    if (delta >= ELEV_GAIN_THRESHOLD_M) {
      gain += delta;
      anchor = ele;
    } else if (ele < anchor) {
      anchor = ele;
    }
  }
  return gain;
}

function normalizeIsoDate(text) {
  if (!text) return undefined;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function parseGpxToBundleTrack(xmlText, id, options = {}) {
  const tolerance = options.simplifyToleranceMeters ?? 25;
  const trkXml = firstMatch(xmlText, /<[^:\s>]*(?::)?trk\b[^>]*>([\s\S]*?)<\/[^:\s>]*(?::)?trk>/i);
  const metadataXml = firstMatch(
    xmlText,
    /<[^:\s>]*(?::)?metadata\b[^>]*>([\s\S]*?)<\/[^:\s>]*(?::)?metadata>/i
  );
  const name =
    (trkXml && firstMatch(trkXml, /<[^:\s>]*(?::)?name\b[^>]*>([\s\S]*?)<\/[^:\s>]*(?::)?name>/i)) ||
    (metadataXml &&
      firstMatch(metadataXml, /<[^:\s>]*(?::)?name\b[^>]*>([\s\S]*?)<\/[^:\s>]*(?::)?name>/i)) ||
    id.replace(/\.gpx$/i, "");
  const metadataTime = normalizeIsoDate(
    metadataXml && firstMatch(metadataXml, /<[^:\s>]*(?::)?time\b[^>]*>([\s\S]*?)<\/[^:\s>]*(?::)?time>/i)
  );

  const segments = [];
  const dateKeys = new Set();
  let distanceM = 0;
  let elevGainM = 0;
  let originalPointCount = 0;
  let pointCount = 0;

  if (metadataTime) dateKeys.add(dateKey(metadataTime));

  const segmentPattern = /<[^:\s>]*(?::)?trkseg\b[^>]*>([\s\S]*?)<\/[^:\s>]*(?::)?trkseg>/gi;
  let segmentMatch;

  while ((segmentMatch = segmentPattern.exec(xmlText))) {
    const originalPoints = parseTrackPoints(segmentMatch[1]);
    if (originalPoints.length === 0) continue;

    originalPointCount += originalPoints.length;
    elevGainM += segmentElevGain(originalPoints);
    for (let i = 1; i < originalPoints.length; i++) {
      distanceM += haversineMeters(originalPoints[i - 1].coord, originalPoints[i].coord);
    }
    for (const point of originalPoints) {
      const key = dateKey(point.time);
      if (key) dateKeys.add(key);
    }

    const simplified = simplifySegment(
      originalPoints.map((point) => point.coord),
      tolerance
    );
    pointCount += simplified.length;
    segments.push(simplified);
  }

  return {
    id,
    name,
    metadataTime,
    segments,
    distanceKm: distanceM / 1000,
    elevGainM,
    dateKeys: [...dateKeys].sort(),
    originalPointCount,
    pointCount,
  };
}

export function buildTrackBundle(tracks) {
  const dateKeys = new Set();
  let distanceKm = 0;
  let elevGainM = 0;
  let originalPointCount = 0;
  let pointCount = 0;

  for (const track of tracks) {
    distanceKm += track.distanceKm;
    elevGainM += track.elevGainM;
    originalPointCount += track.originalPointCount;
    pointCount += track.pointCount;
    for (const key of track.dateKeys) dateKeys.add(key);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    stats: {
      distanceKm,
      elevGainM,
      dateKeys: [...dateKeys].sort(),
      trackDays: tracks.length,
      originalPointCount,
      pointCount,
    },
    tracks,
  };
}
