// auth/Dashboard/charts/AccuracyTrendChart.tsx
//
// "Am I getting better?" — one measure over time, so: a line.
//
// Deliberately a SINGLE series rather than one line per difficulty. The question
// is a trend, not an identity comparison, and a single series needs no legend
// (the title names it) and no categorical palette at all.

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { WeeklyPoint } from "./progressChartData";
import { ACCENT, CHROME, MARKS } from "./chartTokens";
import { ChartCard, ChartEmptyState, ChartTooltip } from "./ChartFrame";
import { useChartWidth } from "./useChartWidth";

const PLOT_H = 160;
// top matches WeeklyActivityChart so the two plots line up side by side.
const PAD = { top: 20, right: 16, bottom: 24, left: 34 };
const SVG_H = PAD.top + PLOT_H + PAD.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];

interface Props {
  weeks: WeeklyPoint[];
  hasData: boolean;
}

const AccuracyTrendChart: React.FC<Props> = ({ weeks, hasData }) => {
  const { t } = useTranslation();
  const { ref, width } = useChartWidth();
  const [active, setActive] = useState<number | null>(null);

  const plotW = Math.max(0, width - PAD.left - PAD.right);

  const xOf = (i: number) =>
    weeks.length <= 1 ? PAD.left + plotW / 2 : PAD.left + (i / (weeks.length - 1)) * plotW;
  const yOf = (pct: number) => PAD.top + (1 - pct / 100) * PLOT_H;

  /**
   * Consecutive runs of weeks that actually have quiz data. A week with no
   * questions is a gap, so the line breaks instead of diving to 0% — drawing
   * through it would claim the learner scored nothing that week.
   */
  const runs = useMemo(() => {
    const out: { i: number; point: WeeklyPoint }[][] = [];
    let current: { i: number; point: WeeklyPoint }[] = [];

    weeks.forEach((point, i) => {
      if (point.accuracy === null) {
        if (current.length) out.push(current);
        current = [];
      } else {
        current.push({ i, point });
      }
    });
    if (current.length) out.push(current);
    return out;
  }, [weeks]);

  const lastPoint = useMemo(() => {
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (weeks[i].accuracy !== null) return { i, point: weeks[i] };
    }
    return null;
  }, [weeks]);

  const tableRows = weeks.map((w) => [
    w.label,
    w.accuracy === null ? "—" : `${w.accuracy}%`,
    String(w.correct),
    String(w.questions),
  ]);

  const body = !hasData ? (
    <ChartEmptyState height={SVG_H} message={t("dashboard.charts.empty")} />
  ) : (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={SVG_H}
        role="img"
        aria-label={t("dashboard.charts.accuracy.title")}
        style={{ display: "block", overflow: "visible" }}
      >
        {/* Gridlines: solid hairlines one step off the surface, never dashed. */}
        {Y_TICKS.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={yOf(tick)}
              y2={yOf(tick)}
              stroke={tick === 0 ? CHROME.baseline : CHROME.gridline}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={yOf(tick) + 3}
              textAnchor="end"
              fontSize={10}
              fill={CHROME.muted}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Area wash under each run — a single series is allowed an area fill. */}
        {runs
          .filter((run) => run.length > 1)
          .map((run) => (
            <path
              key={`area-${run[0].i}`}
              d={
                `M ${xOf(run[0].i)} ${yOf(0)} ` +
                run.map((r) => `L ${xOf(r.i)} ${yOf(r.point.accuracy as number)}`).join(" ") +
                ` L ${xOf(run[run.length - 1].i)} ${yOf(0)} Z`
              }
              fill={ACCENT}
              opacity={MARKS.areaOpacity}
            />
          ))}

        {runs
          .filter((run) => run.length > 1)
          .map((run) => (
            <path
              key={`line-${run[0].i}`}
              d={run
                .map(
                  (r, k) =>
                    `${k === 0 ? "M" : "L"} ${xOf(r.i)} ${yOf(r.point.accuracy as number)}`
                )
                .join(" ")}
              fill="none"
              stroke={ACCENT}
              strokeWidth={MARKS.lineWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

        {/* Crosshair finds the X so the reader aims at a week, not at a 2px line. */}
        {active !== null && weeks[active]?.accuracy !== null && (
          <line
            x1={xOf(active)}
            x2={xOf(active)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke={CHROME.baseline}
            strokeWidth={1}
          />
        )}

        {/* Dots carry a 2px surface ring so they stay legible over the line. */}
        {runs.flat().map(({ i, point }) => (
          <circle
            key={`dot-${i}`}
            cx={xOf(i)}
            cy={yOf(point.accuracy as number)}
            r={active === i ? MARKS.dotRadius + 1.5 : MARKS.dotRadius}
            fill={ACCENT}
            stroke={CHROME.surface}
            strokeWidth={MARKS.surfaceGap}
          />
        ))}

        {/* Label the endpoint only — a number on every point goes unread. */}
        {lastPoint && (
          <text
            x={
              xOf(lastPoint.i) + 40 > PAD.left + plotW
                ? xOf(lastPoint.i) - 8
                : xOf(lastPoint.i) + 10
            }
            y={yOf(lastPoint.point.accuracy as number) - 9}
            textAnchor={xOf(lastPoint.i) + 40 > PAD.left + plotW ? "end" : "start"}
            fontSize={12}
            fontWeight={700}
            fill={CHROME.textPrimary}
          >
            {lastPoint.point.accuracy}%
          </text>
        )}

        {/* X labels: first, last, and every other one between, so they never collide. */}
        {weeks.map((week, i) => {
          const show = i === 0 || i === weeks.length - 1 || i % 2 === 0;
          if (!show) return null;
          return (
            <text
              key={week.weekStart}
              x={xOf(i)}
              y={PAD.top + PLOT_H + 16}
              textAnchor={i === 0 ? "start" : i === weeks.length - 1 ? "end" : "middle"}
              fontSize={10}
              fill={CHROME.muted}
            >
              {week.label}
            </text>
          );
        })}

        {/* One hit layer: pointer anywhere in the plot snaps to the nearest week. */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={plotW}
          height={PLOT_H}
          fill="transparent"
          tabIndex={0}
          role="slider"
          aria-label={t("dashboard.charts.accuracy.scrub")}
          aria-valuemin={0}
          aria-valuemax={weeks.length - 1}
          aria-valuenow={active ?? 0}
          aria-valuetext={
            active !== null
              ? `${weeks[active].label}: ${
                  weeks[active].accuracy === null
                    ? t("dashboard.charts.noData")
                    : `${weeks[active].accuracy}%`
                }`
              : undefined
          }
          style={{ cursor: "crosshair", outline: "none" }}
          onPointerMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const rel = e.clientX - box.left;
            const step = weeks.length <= 1 ? 1 : plotW / (weeks.length - 1);
            setActive(Math.max(0, Math.min(weeks.length - 1, Math.round(rel / step))));
          }}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(lastPoint?.i ?? 0)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            setActive((prev) => {
              const base = prev ?? 0;
              const next = e.key === "ArrowLeft" ? base - 1 : base + 1;
              return Math.max(0, Math.min(weeks.length - 1, next));
            });
          }}
        />
      </svg>

      {active !== null && (
        <ChartTooltip
          x={xOf(active)}
          y={
            weeks[active].accuracy === null
              ? PAD.top
              : yOf(weeks[active].accuracy as number) - 58
          }
          containerWidth={width}
          title={weeks[active].label}
          rows={[
            {
              label: t("dashboard.charts.accuracy.legend"),
              value:
                weeks[active].accuracy === null
                  ? t("dashboard.charts.noData")
                  : `${weeks[active].accuracy}%`,
              color: ACCENT,
              mark: "line",
            },
            {
              label: t("dashboard.charts.parts"),
              value: String(weeks[active].total),
            },
          ]}
        />
      )}
    </div>
  );

  return (
    <ChartCard
      title={t("dashboard.charts.accuracy.title")}
      subtitle={t("dashboard.charts.accuracy.subtitle")}
      tableLabel={t("dashboard.charts.showTable")}
      tableHead={[
        t("dashboard.charts.week"),
        t("dashboard.charts.accuracy.legend"),
        t("dashboard.charts.correct"),
        t("dashboard.charts.questions"),
      ]}
      tableRows={tableRows}
    >
      {body}
    </ChartCard>
  );
};

export default AccuracyTrendChart;
