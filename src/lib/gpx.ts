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
};

export type TrackStats = {
  distanceKm: number;
  elevGainM: number;
  dateKeys: Set<string>;
};

export function parseGpx(xmlText: string, id: string): ParsedTrack {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const parseErr = doc.querySelector("parsererror");
  if (parseErr) {
    throw new Error(`GPX parse error in ${id}: ${parseErr.textContent}`);
  }

  const nameEl = doc.querySelector("trk > name, metadata > name");
  const name = nameEl?.textContent?.trim() || id.replace(/\.gpx$/i, "");

  const segments: TrkSegment[] = [];
  const segEls = doc.querySelectorAll("trkseg");
  segEls.forEach((segEl) => {
    const pts: TrkPoint[] = [];
    segEl.querySelectorAll("trkpt").forEach((ptEl) => {
      const lat = parseFloat(ptEl.getAttribute("lat") || "");
      const lon = parseFloat(ptEl.getAttribute("lon") || "");
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const eleText = ptEl.querySelector("ele")?.textContent;
      const timeText = ptEl.querySelector("time")?.textContent;
      const ele = eleText ? parseFloat(eleText) : undefined;
      const time = timeText ? new Date(timeText) : undefined;
      pts.push({
        lat,
        lon,
        ele: Number.isFinite(ele) ? ele : undefined,
        time: time && !isNaN(time.getTime()) ? time : undefined,
      });
    });
    if (pts.length > 0) segments.push(pts);
  });

  if (segments.length === 0) {
    const pts: TrkPoint[] = [];
    doc.querySelectorAll("rtept, wpt").forEach((ptEl) => {
      const lat = parseFloat(ptEl.getAttribute("lat") || "");
      const lon = parseFloat(ptEl.getAttribute("lon") || "");
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        pts.push({ lat, lon });
      }
    });
    if (pts.length > 0) segments.push(pts);
  }

  return { id, name, segments };
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

function smooth(values: number[], window: number): number[] {
  if (values.length === 0) return values;
  const half = Math.floor(window / 2);
  const out = new Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      sum += values[j];
      count++;
    }
    out[i] = sum / count;
  }
  return out;
}

const ELEV_THRESHOLD_M = 1;

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
    for (const seg of track.segments) {
      for (let i = 1; i < seg.length; i++) {
        distanceM += haversine(seg[i - 1], seg[i]);
      }
      const eles = seg.map((p) => p.ele).filter((v): v is number => typeof v === "number");
      if (eles.length >= 2) {
        const sm = smooth(eles, 5);
        for (let i = 1; i < sm.length; i++) {
          const delta = sm[i] - sm[i - 1];
          if (delta > ELEV_THRESHOLD_M) elevGainM += delta;
        }
      }
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
