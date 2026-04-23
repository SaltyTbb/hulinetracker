import { useEffect, useRef } from "react";
import maplibregl, { Map as MLMap, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, MultiLineString } from "geojson";
import {
  COLOR_DASH,
  COLOR_PREVIEW,
  COLOR_TRACK,
  COLOR_TRACK_GLOW,
  HEIHE,
  TENGCHONG,
} from "../lib/constants";
import { ParsedTrack, trackToGeoJSON, tracksBounds } from "../lib/gpx";

type Props = {
  tracks: ParsedTrack[];
  previewTracks: ParsedTrack[];
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

export default function MapView({ tracks, previewTracks }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const loadedRef = useRef(false);
  const fittedFallbackRef = useRef(false);
  const fittedTracksRef = useRef(false);

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

    map.on("load", () => {
      map.addSource("dashed", { type: "geojson", data: dashedFC() });
      map.addLayer({
        id: "dashed-line",
        type: "line",
        source: "dashed",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLOR_DASH,
          "line-width": 1.6,
          "line-dasharray": [2, 3],
          "line-opacity": 0.75,
        },
      });

      map.addSource("tracks", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "tracks-glow",
        type: "line",
        source: "tracks",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLOR_TRACK_GLOW,
          "line-width": 7,
          "line-opacity": 0.25,
          "line-blur": 2,
        },
      });
      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLOR_TRACK,
          "line-width": 3,
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
          "line-width": 3,
          "line-dasharray": [1, 1.2],
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
      map.addLayer({
        id: "endpoints-label",
        type: "symbol",
        source: "endpoints",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
          "text-offset": [0, 1.4],
          "text-size": 13,
          "text-anchor": "top",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": COLOR_TRACK,
          "text-halo-color": "#000",
          "text-halo-width": 1.5,
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
    if (!map || !loadedRef.current) return;

    const tracksSrc = map.getSource("tracks") as maplibregl.GeoJSONSource | undefined;
    tracksSrc?.setData(tracksToFC(tracks));

    const previewSrc = map.getSource("preview") as maplibregl.GeoJSONSource | undefined;
    previewSrc?.setData(tracksToFC(previewTracks));

    const trackBounds = tracksBounds([...tracks, ...previewTracks]);
    if (trackBounds && !fittedTracksRef.current) {
      const minLon = Math.min(trackBounds[0][0], TENGCHONG[0], HEIHE[0]);
      const minLat = Math.min(trackBounds[0][1], TENGCHONG[1], HEIHE[1]);
      const maxLon = Math.max(trackBounds[1][0], TENGCHONG[0], HEIHE[0]);
      const maxLat = Math.max(trackBounds[1][1], TENGCHONG[1], HEIHE[1]);
      map.fitBounds(
        [
          [minLon, minLat],
          [maxLon, maxLat],
        ],
        { padding: 70, duration: 800, maxZoom: 7 }
      );
      fittedTracksRef.current = true;
      fittedFallbackRef.current = true;
    } else if (!trackBounds && !fittedFallbackRef.current) {
      map.fitBounds(
        [
          [TENGCHONG[0] - 2, TENGCHONG[1] - 2],
          [HEIHE[0] + 2, HEIHE[1] + 2],
        ],
        { padding: 60, duration: 600 }
      );
      fittedFallbackRef.current = true;
    }
  };

  useEffect(() => {
    applyData();
  }, [tracks, previewTracks]);

  return <div ref={containerRef} className="absolute inset-0 bg-black" />;
}
