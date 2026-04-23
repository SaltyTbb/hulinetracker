import { useEffect, useMemo, useState } from "react";
import MapView from "./components/MapView";
import TrackerPanel from "./components/TrackerPanel";
import UploadDrawer from "./components/UploadDrawer";
import { ParsedTrack, computeStatsForTracks, parseGpx } from "./lib/gpx";

type Manifest = { files: string[] };

async function loadManifest(): Promise<string[]> {
  try {
    const url = `${import.meta.env.BASE_URL}gpx/index.json`;
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return [];
    const data = (await res.json()) as Manifest;
    return data.files || [];
  } catch {
    return [];
  }
}

async function loadGpx(filename: string): Promise<ParsedTrack | null> {
  try {
    const url = `${import.meta.env.BASE_URL}gpx/${encodeURIComponent(filename)}`;
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    const text = await res.text();
    return parseGpx(text, filename);
  } catch (err) {
    console.error("Failed to load", filename, err);
    return null;
  }
}

export default function App() {
  const [tracks, setTracks] = useState<ParsedTrack[]>([]);
  const [previewTracks, setPreviewTracks] = useState<ParsedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const files = await loadManifest();
      console.log("[hulinetracker] manifest:", files);
      const parsed = (await Promise.all(files.map(loadGpx))).filter(
        (t): t is ParsedTrack => t !== null
      );
      console.log(
        "[hulinetracker] parsed tracks:",
        parsed.map((t) => ({
          id: t.id,
          name: t.name,
          segments: t.segments.length,
          points: t.segments.reduce((n, s) => n + s.length, 0),
          metadataTime: t.metadataTime?.toISOString(),
        }))
      );
      setTracks(parsed);
      setLoading(false);
    })();
  }, []);

  const combinedStats = useMemo(
    () => computeStatsForTracks([...tracks, ...previewTracks]),
    [tracks, previewTracks]
  );

  const addPreview = (newTracks: ParsedTrack[]) =>
    setPreviewTracks((prev) => [...prev, ...newTracks]);
  const removePreview = (id: string) =>
    setPreviewTracks((prev) => prev.filter((t) => t.id !== id));
  const clearPreview = () => setPreviewTracks([]);

  return (
    <div className="relative h-full w-full bg-black text-neutral-100 font-sans">
      <MapView tracks={tracks} previewTracks={previewTracks} />

      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-400 backdrop-blur">
          加载轨迹中…
        </div>
      )}

      <aside className="hidden md:flex absolute top-3 right-3 bottom-3 w-[360px] z-10 flex-col gap-3 p-3 bg-black/70 backdrop-blur-md border border-neutral-800 rounded-2xl overflow-y-auto">
        <TrackerPanel
          stats={combinedStats}
          trackCount={tracks.length}
          previewCount={previewTracks.length}
        />
        <UploadDrawer
          previewTracks={previewTracks}
          onAdd={addPreview}
          onRemove={removePreview}
          onClearAll={clearPreview}
        />
        <div className="mt-auto pt-2 text-[10px] text-neutral-600 text-center">
          hulinetracker · 云南 → 东北
        </div>
      </aside>

      <div className="md:hidden">
        {!panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full bg-brand-yellow text-black text-xs font-semibold shadow-lg"
          >
            Tracker
          </button>
        )}

        {panelOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-20 backdrop-blur-sm"
              onClick={() => setPanelOpen(false)}
            />
            <div
              className="fixed left-0 right-0 bottom-0 z-30"
              style={{ maxHeight: "85vh" }}
            >
              <div className="relative bg-neutral-950 border-t border-neutral-800 rounded-t-2xl p-3 pt-5 flex flex-col gap-3 overflow-y-auto max-h-[85vh]">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-neutral-700 rounded-full" />
                <button
                  onClick={() => setPanelOpen(false)}
                  className="absolute right-3 top-2 text-neutral-400 text-xs px-2 py-1"
                >
                  关闭
                </button>
                <TrackerPanel
                  stats={combinedStats}
                  trackCount={tracks.length}
                  previewCount={previewTracks.length}
                />
                <UploadDrawer
                  previewTracks={previewTracks}
                  onAdd={addPreview}
                  onRemove={removePreview}
                  onClearAll={clearPreview}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
