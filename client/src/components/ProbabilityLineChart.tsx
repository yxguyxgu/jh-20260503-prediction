import { useMemo } from "react";

type Bet = {
  amount: number;
  bet_on: string;
  created_at: string;
};

export type ProbPoint = { t: number; p: number };

function buildSeries(bets: Bet[]): ProbPoint[] {
  const sorted = [...bets].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  let yes = 0;
  let no = 0;
  const points: ProbPoint[] = [];

  const implied = () => (yes + no === 0 ? 0.5 : yes / (yes + no));

  if (sorted.length === 0) {
    const now = Date.now();
    points.push({ t: now, p: 0.5 });
    return points;
  }

  const t0 = new Date(sorted[0].created_at).getTime() - 1;
  points.push({ t: t0, p: 0.5 });

  for (const b of sorted) {
    if (b.bet_on === "YES") yes += b.amount;
    else no += b.amount;
    points.push({ t: new Date(b.created_at).getTime(), p: implied() });
  }

  return points;
}

function fmtShort(t: number): string {
  return new Date(t).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  bets: Bet[];
  height?: number;
};

export default function ProbabilityLineChart({ bets, height = 120 }: Props) {
  const points = useMemo(() => buildSeries(bets), [bets]);
  const w = 100;
  const h = height;
  const pad = 8;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const { pathD, dot } = useMemo(() => {
    if (points.length < 1) return { pathD: "", dot: null as { cx: number; cy: number } | null };

    const tMin = points[0].t;
    const tMax = points[points.length - 1].t;
    const span = Math.max(tMax - tMin, 1);

    const toX = (t: number) => pad + ((t - tMin) / span) * innerW;
    const toY = (p: number) => pad + (1 - p) * innerH;

    const d = points
      .map((pt, i) => `${i === 0 ? "M" : "L"}${toX(pt.t).toFixed(2)},${toY(pt.p).toFixed(2)}`)
      .join(" ");

    const last = points[points.length - 1];
    return { pathD: d, dot: { cx: toX(last.t), cy: toY(last.p) } };
  }, [points, innerW, innerH, pad]);

  const lastP = points[points.length - 1]?.p ?? 0.5;
  const tStart = points[0]?.t;
  const tEnd = points[points.length - 1]?.t;

  return (
    <div className="prob-chart-wrap">
      <div className="muted" style={{ fontSize: "0.8rem", marginBottom: 4 }}>
        Implied YES % over time · now ≈ {(lastP * 100).toFixed(1)}%
      </div>
      <svg
        className="prob-chart-svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart of implied YES probability over time"
      >
        <rect x={0} y={0} width={w} height={h} fill="#f8fafc" rx={4} />
        {[0.25, 0.5, 0.75].map((p) => {
          const y = pad + (1 - p) * innerH;
          return (
            <line
              key={p}
              x1={pad}
              y1={y}
              x2={w - pad}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth={0.35}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        <text x={pad} y={pad - 2} fontSize={3} fill="#64748b">
          100%
        </text>
        <text x={pad} y={h - 2} fontSize={3} fill="#64748b">
          0%
        </text>
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {dot && bets.length > 0 && <circle cx={dot.cx} cy={dot.cy} r={2} fill="#1d4ed8" />}
      </svg>
      {tStart != null && tEnd != null && bets.length > 0 && (
        <div
          className="prob-chart-axis muted"
          style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginTop: 2 }}
        >
          <span>{fmtShort(tStart)}</span>
          <span>{fmtShort(tEnd)}</span>
        </div>
      )}
      {bets.length === 0 && (
        <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
          No bets yet — line stays at 50%.
        </p>
      )}
    </div>
  );
}
