import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, MultiLineString } from "geojson";
import {
  COLOR_DASH,
  COLOR_PREVIEW,
  COLOR_TRACK,
  HEIHE,
  TENGCHONG,
} from "../lib/constants";
import { ParsedTrack, trackDateKeys, trackToGeoJSON, tracksBounds } from "../lib/gpx";

type Props = {
  tracks: ParsedTrack[];
  previewTracks: ParsedTrack[];
  activeDate: string | null;
};

const DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#000" } },
    { id: "carto", type: "raster", source: "carto-dark" },
  ],
};

function tracksToFC(tracks: ParsedTrack[]): FeatureCollection<MultiLineString> {
  return {
    type: "FeatureCollection",
    features: tracks.map(trackToGeoJSON),
  };
}

function dashedFC(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [TENGCHONG, HEIHE],
        },
      },
    ],
  };
}

function endpointsFC(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { label: "腾冲" },
        geometry: { type: "Point", coordinates: TENGCHONG },
      },
      {
        type: "Feature",
        properties: { label: "黑河" },
        geometry: { type: "Point", coordinates: HEIHE },
      },
    ],
  };
}

export default function MapView({ tracks, previewTracks, activeDate }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const tracksRef = useRef<ParsedTrack[]>([]);
  const previewTracksRef = useRef<ParsedTrack[]>([]);
  const activeDateRef = useRef<string | null>(null);
  const loadedRef = useRef(false);
  const fittedFallbackRef = useRef(false);
  const fittedTracksRef = useRef(false);

  tracksRef.current = tracks;
  previewTracksRef.current = previewTracks;
  activeDateRef.current = activeDate;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [(TENGCHONG[0] + HEIHE[0]) / 2, (TENGCHONG[1] + HEIHE[1]) / 2],
      zoom: 3.5,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    map.on("style.load", () => {
      map.addSource("dashed", { type: "geojson", data: dashedFC() });
      map.addLayer({
        id: "dashed-line",
        type: "line",
        source: "dashed",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLOR_DASH,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 1.4,
            10, 2.2,
          ],
          "line-dasharray": [2, 3],
          "line-opacity": 0.7,
        },
      });

      map.addSource("tracks", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLOR_TRACK,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 2,
            7, 2.4,
            12, 2,
          ],
          "line-opacity": 0.35,
          "line-dasharray": [1, 2.2],
        },
      });

      map.addSource("preview", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "preview-line",
        type: "line",
        source: "preview",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLOR_PREVIEW,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 1.8,
            7, 2.2,
            12, 1.8,
          ],
          "line-opacity": 0.35,
          "line-dasharray": [1, 2.2],
        },
      });

      map.addSource("highlight", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "highlight-line",
        type: "line",
        source: "highlight",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLOR_TRACK,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            3, 4.5,
            7, 5,
            12, 4.5,
          ],
          "line-opacity": 1,
        },
      });

      map.addSource("endpoints", { type: "geojson", data: endpointsFC() });
      map.addLayer({
        id: "endpoints-glow-outer",
        type: "circle",
        source: "endpoints",
        paint: {
          "circle-radius": 22,
          "circle-color": COLOR_TRACK,
          "circle-opacity": 0.06,
          "circle-blur": 1,
        },
      });
      map.addLayer({
        id: "endpoints-glow-mid",
        type: "circle",
        source: "endpoints",
        paint: {
          "circle-radius": 13,
          "circle-color": COLOR_TRACK,
          "circle-opacity": 0.14,
          "circle-blur": 0.6,
        },
      });
      map.addLayer({
        id: "endpoints-glow-inner",
        type: "circle",
        source: "endpoints",
        paint: {
          "circle-radius": 7,
          "circle-color": COLOR_TRACK,
          "circle-opacity": 0.35,
          "circle-blur": 0.3,
        },
      });
      map.addLayer({
        id: "endpoints-core",
        type: "circle",
        source: "endpoints",
        paint: {
          "circle-radius": 2.6,
          "circle-color": "#FFF8CC",
          "circle-opacity": 0.95,
          "circle-stroke-color": COLOR_TRACK,
          "circle-stroke-width": 1.2,
          "circle-stroke-opacity": 0.9,
        },
      });
      loadedRef.current = true;
      applyData();
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
      fittedFallbackRef.current = false;
      fittedTracksRef.current = false;
    };
  }, []);

  const applyData = () => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) {
      console.log("[hulinetracker] applyData skipped:", {
        hasMap: !!map,
        loaded: loadedRef.current,
      });
      return;
    }

    const currentTracks = tracksRef.current;
    const currentPreviewTracks = previewTracksRef.current;
    const fc = tracksToFC(currentTracks);
    const totalPts = currentTracks.reduce(
      (n, t) => n + t.segments.reduce((m, s) => m + s.length, 0),
      0
    );
    console.log("[hulinetracker] applyData:", {
      tracks: currentTracks.length,
      points: totalPts,
      features: fc.features.length,
    });

    const tracksSrc = map.getSource("tracks") as maplibregl.GeoJSONSource | undefined;
    tracksSrc?.setData(fc);
    const isHighlighting = activeDateRef.current !== null;
    map.setPaintProperty(
      "tracks-line",
      "line-width",
      isHighlighting
        ? ["interpolate", ["linear"], ["zoom"], 3, 2, 7, 2.4, 12, 2]
        : ["interpolate", ["linear"], ["zoom"], 3, 3.5, 7, 4, 12, 3.5]
    );
    map.setPaintProperty("tracks-line", "line-opacity", isHighlighting ? 0.35 : 1);
    map.setPaintProperty(
      "tracks-line",
      "line-dasharray",
      isHighlighting ? [1, 2.2] : [1, 0]
    );

    const previewSrc = map.getSource("preview") as maplibregl.GeoJSONSource | undefined;
    previewSrc?.setData(tracksToFC(currentPreviewTracks));
    map.setPaintProperty(
      "preview-line",
      "line-width",
      isHighlighting
        ? ["interpolate", ["linear"], ["zoom"], 3, 1.8, 7, 2.2, 12, 1.8]
        : ["interpolate", ["linear"], ["zoom"], 3, 3, 7, 3.5, 12, 3]
    );
    map.setPaintProperty("preview-line", "line-opacity", isHighlighting ? 0.35 : 1);
    map.setPaintProperty(
      "preview-line",
      "line-dasharray",
      isHighlighting ? [1, 2.2] : [1, 1.2]
    );

    const activeDate = activeDateRef.current;
    const highlightTracks = activeDate
      ? [...currentTracks, ...currentPreviewTracks].filter((track) =>
          trackDateKeys(track).includes(activeDate)
        )
      : [];
    const highlightSrc = map.getSource("highlight") as maplibregl.GeoJSONSource | undefined;
    highlightSrc?.setData(tracksToFC(highlightTracks));

    const trackBounds = tracksBounds([...currentTracks, ...currentPreviewTracks]);
    const isDesktop =
      typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    const padding = isDesktop
      ? { top: 60, bottom: 60, left: 60, right: 400 }
      : { top: 60, bottom: 60, left: 40, right: 40 };

    if (trackBounds && !fittedTracksRef.current) {
      console.log("[hulinetracker] fit to tracks:", trackBounds, padding);
      map.fitBounds(trackBounds, {
        padding,
        duration: 800,
        maxZoom: 11,
      });
      fittedTracksRef.current = true;
      fittedFallbackRef.current = true;
    } else if (!trackBounds && !fittedFallbackRef.current) {
      map.fitBounds(
        [
          [TENGCHONG[0] - 2, TENGCHONG[1] - 2],
          [HEIHE[0] + 2, HEIHE[1] + 2],
        ],
        { padding, duration: 600 }
      );
      fittedFallbackRef.current = true;
    }
  };

  useEffect(() => {
    applyData();
  }, [tracks, previewTracks, activeDate]);

  return <div ref={containerRef} className="absolute inset-0 bg-black" />;
}
