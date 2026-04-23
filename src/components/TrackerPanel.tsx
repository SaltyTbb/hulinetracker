import { TARGET_DISTANCE_KM, TARGET_ELEV_GAIN_M } from "../lib/constants";
import { TrackStats } from "../lib/gpx";

type Props = {
  stats: TrackStats;
  trackCount: number;
  previewCount: number;
};

function Stat({
  labelZh,
  labelEn,
  value,
  unit,
}: {
  labelZh: string;
  labelEn: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex-1 min-w-0">
      <div className="text-[11px] text-neutral-400 leading-tight truncate">
        {labelZh}
      </div>
      <div
        className="text-[9px] uppercase tracking-wider text-neutral-600 leading-tight mt-0.5 line-clamp-2 break-words min-h-[1.7em]"
        title={labelEn}
      >
        {labelEn}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-xl font-bold text-brand-yellow tabular-nums">
          {value}
        </span>
        {unit && <span className="text-xs text-neutral-400">{unit}</span>}
      </div>
    </div>
  );
}

function Progress({
  labelZh,
  labelEn,
  current,
  target,
  unit,
  format,
  remainingLabel,
}: {
  labelZh: string;
  labelEn: string;
  current: number;
  target: number;
  unit: string;
  format: (n: number) => string;
  remainingLabel: { zh: string; en: string };
}) {
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-neutral-400 leading-tight truncate">
            {labelZh}
          </div>
          <div
            className="text-[9px] uppercase tracking-wider text-neutral-600 leading-tight mt-0.5 line-clamp-2 break-words"
            title={labelEn}
          >
            {labelEn}
          </div>
        </div>
        <div className="text-xs text-neutral-400 tabular-nums shrink-0">
          {pct.toFixed(1)}%
        </div>
      </div>
      <div className="mt-2.5 h-2 w-full bg-black border border-neutral-800 rounded-full overflow-hidden">
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
        <span title={remainingLabel.en}>
          {remainingLabel.zh} {format(Math.max(0, target - current))} {unit}
        </span>
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
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-lg font-bold text-brand-yellow tracking-tight">
            纵穿胡焕庸线
          </h1>
          <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Across the Hu Line
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          腾冲 → 黑河 · {trackCount} tracks
          {previewCount > 0 && (
            <span className="text-orange-400"> · +{previewCount} preview</span>
          )}
        </p>
      </div>

      <div className="flex gap-2">
        <Stat
          labelZh="已骑天数"
          labelEn="Total Days"
          value={String(days)}
          unit="天 / d"
        />
        <Stat
          labelZh="日均里程"
          labelEn="Daily Avg Distance"
          value={avgDistanceKm.toFixed(1)}
          unit="km"
        />
        <Stat
          labelZh="日均爬升"
          labelEn="Daily Avg Climb"
          value={Math.round(avgElevM).toString()}
          unit="m"
        />
      </div>

      <Progress
        labelZh="距离进度"
        labelEn="Distance progress"
        current={stats.distanceKm}
        target={TARGET_DISTANCE_KM}
        unit="km"
        format={(n) => n.toFixed(1)}
        remainingLabel={{ zh: "剩", en: "left" }}
      />
      <Progress
        labelZh="爬升进度"
        labelEn="Climb progress"
        current={stats.elevGainM}
        target={TARGET_ELEV_GAIN_M}
        unit="m"
        format={(n) => Math.round(n).toLocaleString()}
        remainingLabel={{ zh: "剩", en: "left" }}
      />
    </div>
  );
}
