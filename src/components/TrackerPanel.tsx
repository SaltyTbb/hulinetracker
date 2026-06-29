import { ParsedTrack, TrackStats, trackDateKeys } from "../lib/gpx";

type Props = {
  stats: TrackStats;
  trackCount: number;
  previewCount: number;
  tracks: ParsedTrack[];
  activeDate: string | null;
  lockedDate: string | null;
  onHoverDateChange: (date: string | null) => void;
  onLockedDateToggle: (date: string) => void;
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

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateKey(date: Date) {
  return `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long" });
}

function CalendarPanel({
  tracks,
  activeDate,
  lockedDate,
  onHoverDateChange,
  onLockedDateToggle,
}: {
  tracks: ParsedTrack[];
  activeDate: string | null;
  lockedDate: string | null;
  onHoverDateChange: (date: string | null) => void;
  onLockedDateToggle: (date: string) => void;
}) {
  const trackCountByDate = new Map<string, number>();
  for (const track of tracks) {
    for (const key of trackDateKeys(track)) {
      trackCountByDate.set(key, (trackCountByDate.get(key) ?? 0) + 1);
    }
  }

  const sortedDates = [...trackCountByDate.keys()].sort();
  if (sortedDates.length === 0) return null;

  const firstDate = new Date(`${sortedDates[0]}T00:00:00`);
  const lastDate = new Date(`${sortedDates[sortedDates.length - 1]}T00:00:00`);
  const months: Date[] = [];
  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const end = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[11px] text-neutral-400 leading-tight">
            三个月日历
          </div>
          <div className="text-[9px] uppercase tracking-wider text-neutral-600 leading-tight mt-0.5">
            Hover to preview · click to lock
          </div>
        </div>
        <div className="text-[10px] text-neutral-500 tabular-nums">
          {sortedDates.length} dates
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        {months.map((month) => {
          const daysInMonth = new Date(
            month.getFullYear(),
            month.getMonth() + 1,
            0
          ).getDate();
          const leading = new Date(
            month.getFullYear(),
            month.getMonth(),
            1
          ).getDay();

          return (
            <div key={monthKey(month)}>
              <div className="mb-1.5 text-[10px] text-neutral-300 font-semibold">
                {monthLabel(month)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-neutral-600">
                {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: leading }).map((_, index) => (
                  <div key={`blank-${index}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const key = dateKey(
                    new Date(month.getFullYear(), month.getMonth(), day)
                  );
                  const count = trackCountByDate.get(key) ?? 0;
                  const hasTrack = count > 0;
                  const isActive = activeDate === key;
                  const isLocked = lockedDate === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      className={[
                        "aspect-square rounded-md text-[10px] tabular-nums transition",
                        hasTrack
                          ? "bg-brand-yellow/15 text-brand-yellow border border-brand-yellow/30 hover:bg-brand-yellow hover:text-black"
                          : "bg-black/30 text-neutral-700 border border-neutral-800",
                        isActive
                          ? "ring-2 ring-brand-yellow bg-brand-yellow text-black"
                          : "",
                        isLocked ? "border-brand-yellow shadow-[0_0_0_1px_#facc15]" : "",
                      ].join(" ")}
                      title={
                        hasTrack
                          ? `${key} · ${count} track${count > 1 ? "s" : ""}${
                              isLocked ? " · locked" : ""
                            }`
                          : key
                      }
                      aria-pressed={isLocked}
                      onClick={() => hasTrack && onLockedDateToggle(key)}
                      onMouseEnter={() => hasTrack && onHoverDateChange(key)}
                      onMouseLeave={() => hasTrack && onHoverDateChange(null)}
                      onFocus={() => hasTrack && onHoverDateChange(key)}
                      onBlur={() => hasTrack && onHoverDateChange(null)}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TrackerPanel({
  stats,
  trackCount,
  previewCount,
  tracks,
  activeDate,
  lockedDate,
  onHoverDateChange,
  onLockedDateToggle,
}: Props) {
  const days = stats.trackDays;
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
        target={stats.distanceKm}
        unit="km"
        format={(n) => n.toFixed(1)}
        remainingLabel={{ zh: "剩", en: "left" }}
      />
      <Progress
        labelZh="爬升进度"
        labelEn="Climb progress"
        current={stats.elevGainM}
        target={stats.elevGainM}
        unit="m"
        format={(n) => Math.round(n).toLocaleString()}
        remainingLabel={{ zh: "剩", en: "left" }}
      />
      <CalendarPanel
        tracks={tracks}
        activeDate={activeDate}
        lockedDate={lockedDate}
        onHoverDateChange={onHoverDateChange}
        onLockedDateToggle={onLockedDateToggle}
      />
    </div>
  );
}
