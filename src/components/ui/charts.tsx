import { ACCENT, INK, pastelDot, type PastelKey } from "@/lib/tokens";

/* ------------------------------------------------------------------ */
/* Circular gauge (PRD §25, §26, §45)                                  */
/* ------------------------------------------------------------------ */

export function CircularGauge({
  value,
  label,
  sublabel,
  size = 168,
  stroke = 14,
  accent = ACCENT.blue,
  trackColor = "rgba(24,24,28,.10)",
  textColor = INK,
  centerValue,
  unit = "%",
}: {
  value: number;
  label?: string;
  sublabel?: string;
  size?: number;
  stroke?: number;
  accent?: string;
  trackColor?: string;
  textColor?: string;
  centerValue?: string;
  unit?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label ?? "Progress"}: ${clamped}%`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="gf-draw"
            style={{ ["--dash" as string]: `${circumference}` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="gf-num text-[28px] font-semibold leading-none" style={{ color: textColor }}>
            {centerValue ?? `${clamped}${unit}`}
          </span>
          {label ? (
            <span className="mt-1 text-[11px] font-medium" style={{ color: textColor, opacity: 0.62 }}>
              {label}
            </span>
          ) : null}
        </div>
      </div>
      {sublabel ? (
        <p className="text-[12px] font-medium" style={{ color: textColor, opacity: 0.68 }}>
          {sublabel}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Smooth revenue line (PRD §22, §70)                                  */
/* ------------------------------------------------------------------ */

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function SmoothLineChart({
  series,
  compare,
  height = 180,
  accent = ACCENT.blue,
  accentSoft = ACCENT.cyan,
  showAxis = true,
  gradientId = "gf-line",
}: {
  series: { label: string; value: number }[];
  compare?: { label: string; value: number }[];
  height?: number;
  accent?: string;
  accentSoft?: string;
  showAxis?: boolean;
  gradientId?: string;
}) {
  const width = 640;
  const axisHeight = showAxis ? 20 : 0;
  const plotHeight = Math.max(40, height - axisHeight);
  const padding = 6;
  const innerH = Math.max(20, plotHeight - padding * 2);
  const values = [...series.map((s) => s.value), ...(compare ?? []).map((s) => s.value)];
  const max = Math.max(1, ...values);

  const toPoints = (data: { label: string; value: number }[]) =>
    data.map((point, index) => ({
      x: (index / Math.max(1, data.length - 1)) * width,
      y: padding + innerH - (point.value / max) * innerH,
    }));

  const mainPoints = toPoints(series);
  const mainPath = smoothPath(mainPoints);
  const areaPath = `${mainPath} L ${mainPoints[mainPoints.length - 1]?.x ?? 0} ${padding + innerH} L ${mainPoints[0]?.x ?? 0} ${
    padding + innerH
  } Z`;
  const comparePath = compare ? smoothPath(toPoints(compare)) : null;
  const last = mainPoints[mainPoints.length - 1];

  // Axis ticks are rendered as HTML so text never inherits the SVG's
  // non-uniform (preserveAspectRatio="none") scaling.
  const tickCount = Math.min(4, Math.max(1, Math.round(series.length / 8)));
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const position = tickCount === 1 ? 1 : index / (tickCount - 1);
    const seriesIndex = Math.round(position * (series.length - 1));
    return { key: `${series[seriesIndex]?.label ?? index}-${index}`, position, label: formatDay(series[seriesIndex]?.label ?? "") };
  });

  return (
    <div className="relative w-full" style={{ minHeight: plotHeight }}>
      <div className="relative w-full" style={{ height: plotHeight }}>
        <div className="pointer-events-none absolute inset-0">
          {[0.25, 0.5, 0.75].map((ratio) => (
            <span
              key={ratio}
              className="absolute left-0 right-0 border-t border-dashed border-white/[0.06]"
              style={{ top: `${padding + innerH * ratio}px` }}
            />
          ))}
        </div>
        <svg
          viewBox={`0 0 ${width} ${plotHeight}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Trend chart"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentSoft} stopOpacity="0.42" />
              <stop offset="100%" stopColor={accentSoft} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {comparePath ? <path d={comparePath} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2" strokeDasharray="4 6" /> : null}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={mainPath}
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="gf-draw"
            style={{ ["--dash" as string]: "1400" }}
          />
        </svg>
        {last ? (
          <span
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-[#18181C]"
            style={{ left: "100%", top: `${last.y}px`, background: accent }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      {showAxis ? (
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-ghost-muted">
          {ticks.map((tick) => (
            <span key={tick.key} className={tick.position === 1 ? "text-right" : tick.position === 0 ? "text-left" : ""}>
              {tick.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatDay(label: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const [, m, d] = label.split("-");
    return `${d}/${m}`;
  }
  return label;
}

/* ------------------------------------------------------------------ */
/* Mini sparkline (metric cards)                                       */
/* ------------------------------------------------------------------ */

export function MiniChart({
  data,
  accent = ACCENT.purple,
  height = 44,
  strokeWidth = 2.4,
  fill = true,
}: {
  data: number[];
  accent?: string;
  height?: number;
  strokeWidth?: number;
  fill?: boolean;
}) {
  const width = 180;
  const max = Math.max(1, ...data);
  const min = Math.min(...data, 0);
  const points = data.map((value, index) => ({
    x: (index / Math.max(1, data.length - 1)) * width,
    y: height - ((value - min) / Math.max(1, max - min)) * (height - 6) - 3,
  }));
  const path = smoothPath(points);
  const id = `mini-${accent.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" aria-hidden="true">
      {fill ? (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${id})`} />
        </>
      ) : null}
      <path d={path} fill="none" stroke={accent} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Rounded bars (peak hours, growth)                                   */
/* ------------------------------------------------------------------ */

export function BarChart({
  data,
  accent = ACCENT.blue,
  trackColor = "rgba(255,255,255,0.06)",
  height = 160,
  formatValue,
}: {
  data: { label: string; value: number }[];
  accent?: string;
  trackColor?: string;
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="gf-num text-[10px] text-ghost-muted opacity-0 transition-opacity group-hover:opacity-100">
            {formatValue ? formatValue(d.value) : d.value}
          </span>
          <div
            className="w-full rounded-pill bg-pastel-cyan transition-all duration-700 group-hover:bg-white"
            style={{
              height: `${Math.max(6, (d.value / max) * (height - 34))}px`,
              background: trackColor,
              boxShadow: `inset 0 -${Math.max(6, (d.value / max) * (height - 34))}px 0 0 ${accent}`,
            }}
          />
          <span className="text-[10px] text-ghost-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Ranked horizontal bars used for revenue breakdown (PRD §69) */
export function HorizontalBars({
  data,
  formatValue,
}: {
  data: { label: string; value: number; accent: PastelKey }[];
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-4">
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-center justify-between gap-4 text-[13px]">
            <span className="flex items-center gap-2.5 text-ghost-dim">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: pastelDot[d.accent] }} />
              {d.label}
            </span>
            <span className="gf-num font-semibold text-ghost">{formatValue ? formatValue(d.value) : d.value}</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-pill bg-white/5">
            <div
              className="h-full rounded-pill transition-[width] duration-1000"
              style={{ width: `${Math.max(4, (d.value / max) * 100)}%`, background: pastelDot[d.accent] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Donut used for method mix / plan distribution */
export function DonutChart({
  data,
  size = 170,
  thickness = 18,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; accent: PastelKey }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  // Prefix sums keep this pure (no mutation during render).
  const lengths = data.map((d) => (d.value / total) * circumference);
  const offsets = lengths.map((_, index) => lengths.slice(0, index).reduce((sum, value) => sum + value, 0));

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
          {data.map((d, index) => {
            const length = lengths[index];
            const dash = Math.max(0, length - 4);
            return (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={pastelDot[d.accent]}
                strokeWidth={thickness}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offsets[index]}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </svg>
        {centerValue ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="gf-num text-[22px] font-semibold text-ghost">{centerValue}</span>
            {centerLabel ? <span className="mt-0.5 text-[11px] text-ghost-muted">{centerLabel}</span> : null}
          </div>
        ) : null}
      </div>
      <ul className="space-y-2 text-[12.5px]">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-ghost-dim">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: pastelDot[d.accent] }} />
            <span className="min-w-[110px]">{d.label}</span>
            <span className="gf-num font-semibold text-ghost">{Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
