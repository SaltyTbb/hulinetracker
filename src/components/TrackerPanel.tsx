import { TARGET_DISTANCE_KM, TARGET_ELEV_GAIN_M } from "../lib/constants";
import { TrackStats } from "../lib/gpx";

type Props = {
  stats: TrackStats;
  trackCount: number;
  previewCount: number;
};

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex-1">
      <div className="text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-xl font-bold text-brand-yellow tabular-nums">
          {value}
        </span>
        {unit && <span className="text-xs text-neutral-400">{unit}</span>}
      </div>
    </div>
  );
}

function Progress({
  label,
  current,
  target,
  unit,
  format,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  format: (n: number) => string;
}) {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500">
          {label}
        </div>
        <div className="text-xs text-neutral-400 tabular-nums">
          {pct.toFixed(1)}%
        </div>
      </div>
      <div className="mt-2 h-2 w-full bg-black border border-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-yellow rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between text-xs text-neutral-400 tabular-nums">
        <span>
          <span className="text-brand-yellow font-semibold">
            {format(current)}
          </span>{" "}
          / {format(target)} {unit}
        </span>
        <span>还剩 {format(Math.max(0, target - current))} {unit}</span>
      </div>
    </div>
  );
}

export default function TrackerPanel({ stats, trackCount, previewCount }: Props) {
  const days = stats.dateKeys.size;
  const avgDistanceKm = days > 0 ? stats.distanceKm / days : 0;
  const avgElevM = days > 0 ? stats.elevGainM / days : 0;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold text-brand-yellow tracking-tight">
            云南 → 东北 · 骑行
          </h1>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          腾冲 · 黑河  ·  已加载 {trackCount} 条轨迹
          {previewCount > 0 && (
            <span className="text-orange-400">（+{previewCount} 条预览）</span>
          )}
        </p>
      </div>

      <div className="flex gap-2">
        <Stat label="已骑天数" value={String(days)} unit="天" />
        <Stat
          label="日均里程"
          value={avgDistanceKm.toFixed(1)}
          unit="km"
        />
        <Stat
          label="日均爬升"
          value={Math.round(avgElevM).toString()}
          unit="m"
        />
      </div>

      <Progress
        label="距离进度"
        current={stats.distanceKm}
        target={TARGET_DISTANCE_KM}
        unit="km"
        format={(n) => n.toFixed(1)}
      />
      <Progress
        label="爬升进度"
        current={stats.elevGainM}
        target={TARGET_ELEV_GAIN_M}
        unit="m"
        format={(n) => Math.round(n).toLocaleString()}
      />
    </div>
  );
}
