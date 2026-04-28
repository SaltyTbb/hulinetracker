export type TrkPoint = {
  lon: number;
  lat: number;
  ele?: number;
  time?: Date;
};

export type TrkSegment = TrkPoint[];

export type ParsedTrack = {
  id: string;
  name: string;
  segments: TrkSegment[];
  metadataTime?: Date;
};

export type TrackStats = {
  distanceKm: number;
  elevGainM: number;
  dateKeys: Set<string>;
};

function elementsByLocalName(root: Element | Document, localName: string): Element[] {
  const ns = root.getElementsByTagNameNS("*", localName);
  if (ns.length > 0) return Array.from(ns);
  return Array.from(root.getElementsByTagName(localName));
}

function firstChildText(parent: Element, localName: string): string | undefined {
  for (const c of elementsByLocalName(parent, localName)) {
    if (c.parentNode === parent) return c.textContent?.trim() || undefined;
  }
  return undefined;
}

function firstByLocalName(root: Element | Document, localName: string): Element | undefined {
  return elementsByLocalName(root, localName)[0];
}

function parseDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

export function parseGpx(xmlText: string, id: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const parseErr = doc.getElementsByTagName("parsererror")[0];
  if (parseErr) {
    throw new Error(`GPX parse error in ${id}: ${parseErr.textContent}`);
  }

  const trkEl = firstByLocalName(doc, "trk");
  const metadataEl = firstByLocalName(doc, "metadata");
  const nameFromTrk = trkEl ? firstChildText(trkEl, "name") : undefined;
  const nameFromMeta = metadataEl ? firstChildText(metadataEl, "name") : undefined;
  const name = nameFromTrk || nameFromMeta || id.replace(/\.gpx$/i, "");

  const metadataTime = metadataEl
    ? parseDate(firstChildText(metadataEl, "time"))
    : undefined;

  const segments: TrkSegment[] = [];
  for (const segEl of elementsByLocalName(doc, "trkseg")) {
    const pts: TrkPoint[] = [];
    for (const ptEl of elementsByLocalName(segEl, "trkpt")) {
      const lat = parseFloat(ptEl.getAttribute("lat") || "");
      const lon = parseFloat(ptEl.getAttribute("lon") || "");
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const eleText = firstChildText(ptEl, "ele");
      const timeText = firstChildText(ptEl, "time");
      const ele = eleText ? parseFloat(eleText) : undefined;
      pts.push({
        lat,
        lon,
        ele: ele !== undefined && Number.isFinite(ele) ? ele : undefined,
        time: parseDate(timeText),
      });
    }
    if (pts.length > 0) segments.push(pts);
  }

  if (segments.length === 0) {
    const pts: TrkPoint[] = [];
    for (const ptEl of [
      ...elementsByLocalName(doc, "rtept"),
      ...elementsByLocalName(doc, "wpt"),
    ]) {
      const lat = parseFloat(ptEl.getAttribute("lat") || "");
      const lon = parseFloat(ptEl.getAttribute("lon") || "");
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        pts.push({ lat, lon });
      }
    }
    if (pts.length > 0) segments.push(pts);
  }

  return { id, name, segments, metadataTime };
}

const R = 6371008.8;

function haversine(a: TrkPoint, b: TrkPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const ELEV_GAIN_THRESHOLD_M = 3;

function segmentElevGain(seg: TrkSegment): number {
  let gain = 0;
  let anchor: number | undefined;
  for (const p of seg) {
    const ele = p.ele;
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

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeStatsForTracks(tracks: ParsedTrack[]): TrackStats {
  let distanceM = 0;
  let elevGainM = 0;
  const dateKeys = new Set<string>();

  for (const track of tracks) {
    if (track.metadataTime) {
      dateKeys.add(dateKey(track.metadataTime));
    }
    for (const seg of track.segments) {
      for (let i = 1; i < seg.length; i++) {
        distanceM += haversine(seg[i - 1], seg[i]);
      }
      elevGainM += segmentElevGain(seg);
      for (const p of seg) {
        if (p.time) dateKeys.add(dateKey(p.time));
      }
    }
  }

  return {
    distanceKm: distanceM / 1000,
    elevGainM,
    dateKeys,
  };
}

export function trackToGeoJSON(track: ParsedTrack): GeoJSON.Feature<GeoJSON.MultiLineString> {
  return {
    type: "Feature",
    properties: { id: track.id, name: track.name },
    geometry: {
      type: "MultiLineString",
      coordinates: track.segments.map((seg) => seg.map((p) => [p.lon, p.lat])),
    },
  };
}

export function tracksBounds(tracks: ParsedTrack[]): [[number, number], [number, number]] | null {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  let has = false;
  for (const t of tracks) {
    for (const s of t.segments) {
      for (const p of s) {
        has = true;
        if (p.lon < minLon) minLon = p.lon;
        if (p.lat < minLat) minLat = p.lat;
        if (p.lon > maxLon) maxLon = p.lon;
        if (p.lat > maxLat) maxLat = p.lat;
      }
    }
  }
  if (!has) return null;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
}
