// auth/Dashboard/charts/WeeklyActivityChart.tsx
//
// "Am I keeping at it, and on what?" — magnitude over time, split part-to-whole:
// a stacked column chart.
//
// The three difficulties use the ORDINAL ramp from chartTokens (one hue, light to
// dark), not three separate hues, because easy < medium < hard is a tier order —
// the reader should see the ordering in the color. It also survives colorblindness,
// which the green/amber/red on the difficulty cards does not.

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Difficulty } from "../../../types/Dashboard";
import { DIFFICULTIES, niceScale, type WeeklyPoint } from "./progressChartData";
import { CHROME, DIFFICULTY_RAMP, MARKS } from "./chartTokens";
import { ChartCard, ChartEmptyState, ChartTooltip } from "./ChartFrame";
import { useChartWidth } from "./useChartWidth";

const PLOT_H = 160;
const PAD = { top: 20, right: 16, bottom: 24, left: 34 };
const SVG_H = PAD.top + PLOT_H + PAD.bottom;

/** Rounded data-end at the top of the stack; square where it meets the baseline. */
const topRoundedPath = (x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + rr}`,
    `Q ${x} ${y} ${x + rr} ${y}`,
    `L ${x + w - rr} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rr}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
};

interface Props {
  weeks: WeeklyPoint[];
  hasData: boolean;
}

const WeeklyActivityChart: React.FC<Props> = ({ weeks, hasData }) => {
  const { t } = useTranslation();
  const { ref, width } = useChartWidth();
  const [active, setActive] = useState<number | null>(null);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const bandW = weeks.length > 0 ? plotW / weeks.length : plotW;
  // Never fill the band — the leftover is air, and the bar is capped at 24px.
  const barW = Math.min(MARKS.maxBarWidth, Math.max(6, bandW * 0.55));

  const scale = useMemo(
    () => niceScale(Math.max(...weeks.map((w) => w.total), 0)),
    [weeks]
  );

  const yOf = (v: number) => PAD.top + (1 - v / scale.max) * PLOT_H;
  const centerOf = (i: number) => PAD.left + bandW * i + bandW / 2;

  /** Index of the tallest column — the one column that gets a direct label. */
  const peak = useMemo(() => {
    let best = -1;
    weeks.forEach((w, i) => {
      if (w.total > 0 && (best === -1 || w.total > weeks[best].total)) best = i;
    });
    return best;
  }, [weeks]);

  const tableRows = weeks.map((w) => [
    w.label,
    String(w.easy),
    String(w.medium),
    String(w.hard),
    String(w.total),
  ]);

  const body = !hasData ? (
    <ChartEmptyState height={SVG_H} message={t("dashboard.charts.empty")} />
  ) : (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={SVG_H}
        role="img"
        aria-label={t("dashboard.charts.activity.title")}
        style={{ display: "block", overflow: "visible" }}
      >
        {scale.ticks.map((tick) => (
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

        {weeks.map((week, i) => {
          const drawn = DIFFICULTIES.filter((d) => week[d] > 0);
          let acc = 0;

          return (
            <g
              key={week.weekStart}
              opacity={active === null || active === i ? 1 : 0.55}
              style={{ transition: "opacity 150ms" }}
            >
              {DIFFICULTIES.map((difficulty: Difficulty) => {
                const value = week[difficulty];
                if (value === 0) return null;

                const yBottom = yOf(acc);
                const yTop = yOf(acc + value);
                acc += value;

                const isBottom = drawn[0] === difficulty;
                const isTop = drawn[drawn.length - 1] === difficulty;

                // A 2px surface gap separates touching fills. The bottom segment
                // keeps its full height so the stack stays anchored to the baseline.
                const rawH = yBottom - yTop;
                const h = isBottom ? rawH : Math.max(1, rawH - MARKS.surfaceGap);
                const x = centerOf(i) - barW / 2;

                return isTop ? (
                  <path
                    key={difficulty}
                    d={topRoundedPath(x, yTop, barW, h, MARKS.barRadius)}
                    fill={DIFFICULTY_RAMP[difficulty]}
                  />
                ) : (
                  <rect
                    key={difficulty}
                    x={x}
                    y={yTop}
                    width={barW}
                    height={h}
                    fill={DIFFICULTY_RAMP[difficulty]}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Direct-label the extreme only, not every cap. */}
        {peak >= 0 && (
          <text
            x={centerOf(peak)}
            y={yOf(weeks[peak].total) - 7}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={CHROME.textPrimary}
          >
            {weeks[peak].total}
          </text>
        )}

        {weeks.map((week, i) => {
          const show = i === 0 || i === weeks.length - 1 || i % 2 === 0;
          if (!show) return null;
          return (
            <text
              key={week.weekStart}
              x={centerOf(i)}
              y={PAD.top + PLOT_H + 16}
              textAnchor="middle"
              fontSize={10}
              fill={CHROME.muted}
            >
              {week.label}
            </text>
          );
        })}

        {/* Hit target spans the whole band and the full plot height, so it is always
            far larger than the bar it selects. */}
        {weeks.map((week, i) => (
          <rect
            key={`hit-${week.weekStart}`}
            x={PAD.left + bandW * i}
            y={PAD.top}
            width={bandW}
            height={PLOT_H}
            fill="transparent"
            tabIndex={0}
            role="button"
            aria-label={`${week.label}: ${t("dashboard.charts.partsCount", {
              count: week.total,
            })}`}
            style={{ cursor: "pointer", outline: "none" }}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
      </svg>

      {active !== null && (
        <ChartTooltip
          x={centerOf(active)}
          y={Math.max(PAD.top, yOf(weeks[active].total) - 92)}
          containerWidth={width}
          title={weeks[active].label}
          rows={[
            ...DIFFICULTIES.map((d) => ({
              label: t(`dashboard.difficulty.${d}`),
              value: String(weeks[active][d]),
              color: DIFFICULTY_RAMP[d],
              mark: "rect" as const,
            })),
            {
              label: t("dashboard.charts.total"),
              value: String(weeks[active].total),
            },
          ]}
        />
      )}
    </div>
  );

  return (
    <ChartCard
      title={t("dashboard.charts.activity.title")}
      subtitle={t("dashboard.charts.activity.subtitle")}
      tableLabel={t("dashboard.charts.showTable")}
      tableHead={[
        t("dashboard.charts.week"),
        t("dashboard.difficulty.easy"),
        t("dashboard.difficulty.medium"),
        t("dashboard.difficulty.hard"),
        t("dashboard.charts.total"),
      ]}
      tableRows={tableRows}
    >
      {/* Three series, so a legend is always present — identity is never color-alone. */}
      {hasData && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-2">
          {DIFFICULTIES.map((difficulty) => (
            <span key={difficulty} className="flex items-center gap-1.5">
              <span
                className="inline-block rounded-[2px] flex-shrink-0"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: DIFFICULTY_RAMP[difficulty],
                }}
              />
              <span className="text-[11px]" style={{ color: CHROME.textSecondary }}>
                {t(`dashboard.difficulty.${difficulty}`)}
              </span>
            </span>
          ))}
        </div>
      )}
      {body}
    </ChartCard>
  );
};

export default WeeklyActivityChart;
