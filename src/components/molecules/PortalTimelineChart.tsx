import React, { useMemo, useRef, useState } from 'react';
import type { PortalMetrics } from '@/hooks/useAdminStats';

// Status red/blue (references/palette.md status palette) — errors are a
// status, not a categorical content-type identity, so these stay separate
// from AdminStats' per-category hue slots.
const ERROR_COLOR = '#d03b3b';
const REQUEST_COLOR = '#3987e5';

function formatBucketTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Two-line timeline (requests / errors) over the last N minute-buckets — built
// as plain SVG per the dataviz skill's component guidance, no charting
// library. 2px lines, round caps, an end-dot with a surface ring, a hairline
// recessive grid, and a hover crosshair + tooltip (see references/
// marks-and-anatomy.md, interaction.md).
export const PortalTimelineChart: React.FC<{ timeline: PortalMetrics['timeline'] }> = ({ timeline }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 28, left: 40 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxCount = useMemo(
    () => Math.max(1, ...timeline.map((b) => b.count)),
    [timeline]
  );
  // Clean round ticks (0 / … / max), per marks-and-anatomy.md.
  const yTicks = useMemo(() => {
    const step = Math.ceil(maxCount / 4 / 5) * 5 || 1;
    const ticks: number[] = [];
    for (let v = 0; v <= maxCount + step; v += step) ticks.push(v);
    return ticks;
  }, [maxCount]);
  const yMax = yTicks[yTicks.length - 1] || 1;

  const xForIndex = (i: number) =>
    padding.left + (timeline.length <= 1 ? 0 : (i / (timeline.length - 1)) * plotWidth);
  const yForValue = (v: number) => padding.top + plotHeight - (v / yMax) * plotHeight;

  const requestsPath = timeline
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i)} ${yForValue(b.count)}`)
    .join(' ');
  const errorsPath = timeline
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i)} ${yForValue(b.errorCount)}`)
    .join(' ');
  const requestsAreaPath =
    timeline.length > 0
      ? `${requestsPath} L ${xForIndex(timeline.length - 1)} ${yForValue(0)} L ${xForIndex(0)} ${yForValue(0)} Z`
      : '';

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || timeline.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const t = (relX - padding.left) / plotWidth;
    const idx = Math.round(t * (timeline.length - 1));
    setHoverIndex(Math.min(timeline.length - 1, Math.max(0, idx)));
  };

  if (timeline.length === 0) {
    return <p className="text-sm italic text-gray-500">No request activity recorded yet.</p>;
  }

  const hovered = hoverIndex !== null ? timeline[hoverIndex] : null;
  // Keep the tooltip from running off the right edge near the end of the chart.
  const tooltipX = hoverIndex !== null ? xForIndex(hoverIndex) : 0;
  const tooltipAlignRight = tooltipX > width - 140;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: REQUEST_COLOR }} />
          Requests
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: ERROR_COLOR }} />
          Errors
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full cursor-crosshair"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Gridlines — hairline, recessive, one step off the surface */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yForValue(tick)}
              y2={yForValue(tick)}
              stroke="#2c2c2a"
              strokeWidth={1}
            />
            <text x={padding.left - 8} y={yForValue(tick)} textAnchor="end" dominantBaseline="middle" className="fill-gray-500" fontSize={10}>
              {tick}
            </text>
          </g>
        ))}

        {/* X-axis time labels — first, middle, last bucket only */}
        {[0, Math.floor((timeline.length - 1) / 2), timeline.length - 1].map((i, idx) => (
          <text
            key={`${i}-${idx}`}
            x={xForIndex(i)}
            y={height - 8}
            textAnchor={idx === 0 ? 'start' : idx === 2 ? 'end' : 'middle'}
            className="fill-gray-500"
            fontSize={10}
          >
            {formatBucketTime(timeline[i].bucket)}
          </text>
        ))}

        {/* Requests area wash (~10% opacity) + line */}
        <path d={requestsAreaPath} fill={REQUEST_COLOR} opacity={0.1} stroke="none" />
        <path d={requestsPath} fill="none" stroke={REQUEST_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Errors line (no area — secondary series) */}
        <path d={errorsPath} fill="none" stroke={ERROR_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* End-dots with a surface ring */}
        <circle cx={xForIndex(timeline.length - 1)} cy={yForValue(timeline[timeline.length - 1].count)} r={4} fill={REQUEST_COLOR} stroke="#1a1a19" strokeWidth={2} />
        <circle cx={xForIndex(timeline.length - 1)} cy={yForValue(timeline[timeline.length - 1].errorCount)} r={4} fill={ERROR_COLOR} stroke="#1a1a19" strokeWidth={2} />

        {/* Hover crosshair */}
        {hoverIndex !== null && (
          <line
            x1={xForIndex(hoverIndex)}
            x2={xForIndex(hoverIndex)}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="#898781"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        )}
      </svg>

      {hovered && hoverIndex !== null && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs shadow-xl"
          style={{
            left: tooltipAlignRight ? undefined : `${(tooltipX / width) * 100}%`,
            right: tooltipAlignRight ? `${100 - (tooltipX / width) * 100}%` : undefined,
            transform: tooltipAlignRight ? 'translateX(8px)' : 'translateX(8px)',
          }}
        >
          <div className="font-bold text-gray-200">{formatBucketTime(hovered.bucket)}</div>
          <div className="mt-1 flex items-center gap-1.5" style={{ color: REQUEST_COLOR }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: REQUEST_COLOR }} />
            <span className="text-gray-300">{hovered.count} requests</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ERROR_COLOR }} />
            <span className="text-gray-300">{hovered.errorCount} errors</span>
          </div>
        </div>
      )}
    </div>
  );
};
