import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UPLOAD_PASSWORD } from "../lib/constants";
import { parseGpx, ParsedTrack } from "../lib/gpx";

type Props = {
  previewTracks: ParsedTrack[];
  onAdd: (tracks: ParsedTrack[]) => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
};

const SESSION_KEY = "hulinetracker:auth";

export default function UploadDrawer({
  previewTracks,
  onAdd,
  onRemove,
  onClearAll,
}: Props) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === UPLOAD_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "1");
      setAuthed(true);
      setPw("");
      setError(null);
    } else {
      setError("口令不正确");
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.name.toLowerCase().endsWith(".gpx"));
    if (arr.length === 0) return;
    const parsed: ParsedTrack[] = [];
    for (const f of arr) {
      try {
        const text = await f.text();
        const id = `preview:${Date.now()}:${f.name}`;
        parsed.push(parseGpx(text, id));
      } catch (err) {
        console.error(err);
        setError(`解析 ${f.name} 失败`);
      }
    }
    if (parsed.length > 0) onAdd(parsed);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-brand-yellow/60 transition text-sm text-neutral-200 flex items-center justify-between"
      >
        <span>本地预览 GPX</span>
        <span className="text-xs text-neutral-500">
          {open ? "收起" : "展开"}
        </span>
      </button>

      {open && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3">
          {!authed ? (
            <form onSubmit={submitPassword} className="flex flex-col gap-2">
              <label className="text-xs text-neutral-400">
                输入口令以启用拖拽预览
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="口令"
                className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-sm text-neutral-100 focus:outline-none focus:border-brand-yellow/60"
                autoFocus
              />
              {error && <div className="text-xs text-red-400">{error}</div>}
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-brand-yellow text-black font-semibold text-sm hover:brightness-110 transition"
              >
                解锁
              </button>
            </form>
          ) : (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={[
                  "rounded-lg border-2 border-dashed p-4 text-center text-sm cursor-pointer transition",
                  dragOver
                    ? "border-brand-yellow bg-brand-yellow/5 text-brand-yellow"
                    : "border-neutral-700 text-neutral-400 hover:border-brand-yellow/60",
                ].join(" ")}
              >
                <div>拖拽 .gpx 到此处</div>
                <div className="text-xs mt-1 text-neutral-500">或点击选择文件</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".gpx,application/gpx+xml"
                  multiple
                  className="hidden"
                  onChange={onPick}
                />
              </div>

              <p className="text-[11px] leading-relaxed text-neutral-500">
                仅在当前浏览器会话中预览，不会上传到服务器。要永久添加请把文件
                commit 到 <code className="text-neutral-300">public/gpx/</code>。
              </p>

              {previewTracks.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-wider text-neutral-500">
                      本次预览 ({previewTracks.length})
                    </div>
                    <button
                      onClick={onClearAll}
                      className="text-xs text-neutral-500 hover:text-red-400 transition"
                    >
                      全部移除
                    </button>
                  </div>
                  <ul className="flex flex-col gap-1 max-h-40 overflow-auto">
                    {previewTracks.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between text-xs bg-black border border-neutral-800 rounded-lg px-2 py-1.5"
                      >
                        <span className="truncate text-orange-300" title={t.name}>
                          {t.name}
                        </span>
                        <button
                          onClick={() => onRemove(t.id)}
                          className="text-neutral-500 hover:text-red-400 ml-2"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
