import React, { useState } from 'react';
import { ForecastOutput } from '../shared/types';

export interface SeriesPoint {
  period: string;
  solarPeriod: string;
  value: number;
  secondaryValue?: number | null;
  flag?: string;
}

interface TimeSeriesChartProps {
  titleFa: string;
  subtitleFa?: string;
  code: string;
  unitFa: string;
  sourceId: string;
  data: SeriesPoint[];
  secondaryLabelFa?: string;
  height?: number;
  colorHex?: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  titleFa,
  subtitleFa,
  code,
  unitFa,
  sourceId,
  data,
  secondaryLabelFa,
  height = 250,
  colorHex = '#0ea5e9',
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-500">
        داده‌ای برای نمایش نمودار «{titleFa}» موجود نیست.
      </div>
    );
  }

  const allVals = data.flatMap((d) =>
    d.secondaryValue !== undefined && d.secondaryValue !== null
      ? [d.value, d.secondaryValue]
      : [d.value]
  );
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const span = maxVal - minVal === 0 ? 1 : maxVal - minVal;
  const padMin = minVal - span * 0.08;
  const padMax = maxVal + span * 0.08;
  const padSpan = padMax - padMin;

  const w = 720;
  const h = height;
  const padL = 56;
  const padR = 20;
  const padT = 20;
  const padB = 34;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const getX = (i: number) =>
    padL + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const getY = (val: number) => padT + plotH - ((val - padMin) / padSpan) * plotH;

  const pointsStr = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaStr = `${getX(0)},${padT + plotH} ${pointsStr} ${getX(data.length - 1)},${padT + plotH}`;

  const secPoints = data
    .map((d, i) =>
      d.secondaryValue !== undefined && d.secondaryValue !== null
        ? `${getX(i)},${getY(d.secondaryValue)}`
        : null
    )
    .filter(Boolean)
    .join(' ');

  const activeIdx = hoverIdx !== null ? hoverIdx : data.length - 1;
  const activePt = data[activeIdx] || data[data.length - 1];

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => padMin + t * padSpan);

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {titleFa}
          </h3>
          {subtitleFa && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitleFa}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span>{code}</span>
          <span aria-hidden="true">·</span>
          <span>منبع: {sourceId}</span>
          <span aria-hidden="true">·</span>
          <span>واحد: {unitFa}</span>
        </div>
      </div>

      {/* Active Point Readout Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 px-3 mb-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 rounded text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 dark:text-slate-400">
            دوره مشاهده:
          </span>
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
            {activePt.solarPeriod} ({activePt.period})
          </span>
          {activePt.flag && (
            <span className="text-amber-600 dark:text-amber-400">
              · رویداد ساختاری: {activePt.flag}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 font-mono tabular-nums">
          <span>
            مقدار ثبت‌شده:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {activePt.value.toLocaleString('en-US')}
            </strong>{' '}
            {unitFa}
          </span>
          {secondaryLabelFa &&
            activePt.secondaryValue !== undefined &&
            activePt.secondaryValue !== null && (
              <span className="text-amber-600 dark:text-amber-400">
                {secondaryLabelFa}:{' '}
                <strong>{activePt.secondaryValue.toLocaleString('en-US')}</strong>
              </span>
            )}
        </div>
      </div>

      <div className="relative w-full overflow-x-auto" dir="ltr">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Horizontal grid lines */}
          {yTicks.map((tv, idx) => {
            const y = getY(tv);
            return (
              <g key={idx}>
                <line
                  x1={padL}
                  y1={y}
                  x2={w - padR}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {Math.abs(tv) >= 1000
                    ? `${(tv / 1000).toFixed(0)}k`
                    : tv.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Subtle gradient fill */}
          <polygon points={areaStr} fill={colorHex} fillOpacity="0.08" />

          {/* Secondary series (e.g. Rolling average) */}
          {secPoints && (
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.75"
              strokeDasharray="4 4"
              points={secPoints}
            />
          )}

          {/* Main line */}
          <polyline
            fill="none"
            stroke={colorHex}
            strokeWidth="2.25"
            points={pointsStr}
          />

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % 4 !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={d.period}
                x={getX(i)}
                y={h - 10}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {d.solarPeriod}
              </text>
            );
          })}

          {/* Hover vertical guideline */}
          <line
            x1={getX(activeIdx)}
            y1={padT}
            x2={getX(activeIdx)}
            y2={padT + plotH}
            stroke={colorHex}
            strokeOpacity="0.45"
            strokeWidth="1"
          />

          {/* Data points & hit boxes */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.value);
            const isHovered = i === activeIdx;
            return (
              <g key={d.period}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 4.5 : d.flag ? 3.5 : 2}
                  fill={d.flag ? '#f59e0b' : colorHex}
                  stroke="#0f172a"
                  strokeWidth={isHovered ? 1.5 : 0}
                />
                <rect
                  x={cx - plotW / data.length / 2}
                  y={padT}
                  width={plotW / data.length}
                  height={plotH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoverIdx(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export const ForecastFanChart: React.FC<{
  history: SeriesPoint[];
  forecast: ForecastOutput;
}> = ({ history, forecast }) => {
  const recentHistory = history.slice(-12);
  const w = 720;
  const h = 250;
  const padL = 56;
  const padR = 24;
  const padT = 20;
  const padB = 34;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const totalSteps = recentHistory.length + forecast.horizons.length;
  const allValues = [
    ...recentHistory.map((p) => p.value),
    ...forecast.horizons.flatMap((f) => [
      f.interval95Low,
      f.interval95High,
      f.naiveBaseline,
      f.laggedMacroModelEstimate,
    ]),
  ];
  const minVal = Math.min(...allValues) * 0.95;
  const maxVal = Math.max(...allValues) * 1.05;
  const span = maxVal - minVal || 1;

  const getX = (idx: number) => padL + (idx / (totalSteps - 1)) * plotW;
  const getY = (val: number) => padT + plotH - ((val - minVal) / span) * plotH;

  const lastHistIdx = recentHistory.length - 1;
  const lastHistVal = recentHistory[lastHistIdx]?.value ?? 0;

  const histPolyline = recentHistory
    .map((p, i) => `${getX(i)},${getY(p.value)}`)
    .join(' ');

  const fcPoints = [
    { x: getX(lastHistIdx), y: getY(lastHistVal) },
    ...forecast.horizons.map((f, idx) => ({
      x: getX(lastHistIdx + 1 + idx),
      y: getY(f.laggedMacroModelEstimate),
    })),
  ];

  const naivePoints = [
    { x: getX(lastHistIdx), y: getY(lastHistVal) },
    ...forecast.horizons.map((f, idx) => ({
      x: getX(lastHistIdx + 1 + idx),
      y: getY(f.naiveBaseline),
    })),
  ];

  // Build 95% and 80% fan polygons starting from last historical observation
  const fan95Upper = [
    `${getX(lastHistIdx)},${getY(lastHistVal)}`,
    ...forecast.horizons.map(
      (f, idx) => `${getX(lastHistIdx + 1 + idx)},${getY(f.interval95High)}`
    ),
  ];
  const fan95Lower = [
    ...forecast.horizons
      .map((f, idx) => `${getX(lastHistIdx + 1 + idx)},${getY(f.interval95Low)}`)
      .reverse(),
    `${getX(lastHistIdx)},${getY(lastHistVal)}`,
  ];

  const fan80Upper = [
    `${getX(lastHistIdx)},${getY(lastHistVal)}`,
    ...forecast.horizons.map(
      (f, idx) => `${getX(lastHistIdx + 1 + idx)},${getY(f.interval80High)}`
    ),
  ];
  const fan80Lower = [
    ...forecast.horizons
      .map((f, idx) => `${getX(lastHistIdx + 1 + idx)},${getY(f.interval80Low)}`)
      .reverse(),
    `${getX(lastHistIdx)},${getY(lastHistVal)}`,
  ];

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 rounded-lg p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            نمودار بادبزنی پیش‌بینی و عدم قطعیت: {forecast.targetNameFa}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            مبدأ پیش‌بینی: {forecast.originSolarPeriod} · خط برش داده: {forecast.cutoffTimestamp.slice(0, 10)} · نسخه مدل: {forecast.modelVersion}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>خط پیوسته آبی: مشاهده تاریخی</span>
          <span>·</span>
          <span>خط‌چین فیروزه‌ای: مدل کلان با وقفه</span>
          <span>·</span>
          <span>هاشور: بازه اطمینان ۸۰٪ و ۹۵٪</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto" dir="ltr">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
          {/* 95% Fan */}
          <polygon
            points={[...fan95Upper, ...fan95Lower].join(' ')}
            fill="#0ea5e9"
            fillOpacity="0.12"
          />
          {/* 80% Fan */}
          <polygon
            points={[...fan80Upper, ...fan80Lower].join(' ')}
            fill="#0ea5e9"
            fillOpacity="0.24"
          />

          {/* Vertical origin cutoff line */}
          <line
            x1={getX(lastHistIdx)}
            y1={padT}
            x2={getX(lastHistIdx)}
            y2={padT + plotH}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            strokeWidth="1.2"
          />

          {/* Historical polyline */}
          <polyline
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            points={histPolyline}
          />

          {/* Naive baseline */}
          <polyline
            fill="none"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="2 3"
            points={naivePoints.map((p) => `${p.x},${p.y}`).join(' ')}
          />

          {/* Forecast central path */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.25"
            strokeDasharray="5 3"
            points={fcPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          />

          {/* Forecast horizon labels */}
          {forecast.horizons.map((f, idx) => {
            const cx = getX(lastHistIdx + 1 + idx);
            const cy = getY(f.laggedMacroModelEstimate);
            return (
              <g key={f.horizonMonths}>
                <circle cx={cx} cy={cy} r={4} fill="#10b981" />
                <text
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  className="fill-emerald-600 dark:fill-emerald-400 text-[10px] font-mono tabular-nums font-semibold"
                >
                  {f.laggedMacroModelEstimate.toLocaleString('en-US')}
                </text>
                <text
                  x={cx}
                  y={h - 10}
                  textAnchor="middle"
                  className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                >
                  +{f.horizonMonths}M
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
