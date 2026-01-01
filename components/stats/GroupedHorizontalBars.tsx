import { Fonts, rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

export type GroupedHorizontalBarsSeries = {
  key: string;
  label?: string;
  color: string;
  values: Array<number | null>; // aligned to yLabels
  meta?: Array<string | null>; // additional info to show near the bar
  metaColor?: string; // color for the meta text
};

export type GroupedHorizontalBarsProps = {
  width: number;
  height: number;
  yLabels: string[];
  series: GroupedHorizontalBarsSeries[];
  maxValue?: number;
  showGrid?: boolean;
  xTickCount?: number;
  referenceValue?: number;
};

export function GroupedHorizontalBars(props: GroupedHorizontalBarsProps) {
  const { colors } = useTrenaTheme();
  const { width, height, yLabels, series, maxValue, showGrid = true, xTickCount = 4, referenceValue } = props;

  const pad = { l: 40, r: 10, t: 10, b: 26 };
  const innerW = Math.max(0, width - pad.l - pad.r);
  const innerH = Math.max(0, height - pad.t - pad.b);

  const rowCount = Math.max(1, yLabels.length);
  const rowH = innerH / rowCount;
  const gapY = 6;

  const computedMax = useMemo(() => {
    let m = isFiniteNumber(maxValue) && maxValue > 0 ? maxValue : 0;
    for (const s of series) {
      for (const v of s.values) if (isFiniteNumber(v) && v > m) m = v;
    }
    if (isFiniteNumber(referenceValue)) m = Math.max(m, referenceValue);
    return Math.max(1, m);
  }, [maxValue, series, referenceValue]);

  const perRow = Math.max(1, series.length);
  const barGap = 4;
  const barGroupH = Math.max(6, rowH - 2 * gapY);
  const barH = Math.max(3, (barGroupH - (perRow - 1) * barGap) / perRow);

  const ticks = useMemo(() => {
    const n = Math.max(2, Math.min(6, xTickCount));
    return Array.from({ length: n }, (_, i) => i / (n - 1));
  }, [xTickCount]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {showGrid ? (
          <>
            <Line
              x1={pad.l}
              x2={pad.l + innerW}
              y1={pad.t}
              y2={pad.t}
              stroke={rgba(colors.text, 0.1)}
              strokeWidth={1}
            />
            <Line
              x1={pad.l}
              x2={pad.l + innerW}
              y1={pad.t + innerH}
              y2={pad.t + innerH}
              stroke={rgba(colors.text, 0.1)}
              strokeWidth={1}
            />
            {ticks.slice(1, -1).map((t) => (
              <Line
                key={`vx-${t}`}
                x1={pad.l + innerW * t}
                x2={pad.l + innerW * t}
                y1={pad.t}
                y2={pad.t + innerH}
                stroke={rgba(colors.text, 0.08)}
                strokeWidth={1}
              />
            ))}
          </>
        ) : null}

        {yLabels.map((lab, rowIdx) => {
          const yRowTop = pad.t + rowH * rowIdx;
          const yCenter = yRowTop + rowH / 2 + 4;
          return (
            <SvgText
              key={`yl-${rowIdx}`}
              x={pad.l - 10}
              y={yCenter}
              fill={rgba(colors.text, 0.75)}
              fontSize={12}
              fontFamily={Fonts.medium}
              textAnchor="end"
            >
              {lab}
            </SvgText>
          );
        })}

        {/* Bars */}
        {yLabels.map((_, rowIdx) => {
          const yRowTop = pad.t + rowH * rowIdx + gapY;

          return series.map((s, sIdx) => {
            const v = s.values[rowIdx];
            if (!isFiniteNumber(v) || v <= 0) return null;

            const t = v / computedMax;
            const w = innerW * Math.max(0, Math.min(1, t));
            const x = pad.l;
            const y = yRowTop + sIdx * (barH + barGap);
            const r = Math.min(8, barH / 2);
            const meta = s.meta?.[rowIdx];

            return (
              <React.Fragment key={`bar-${rowIdx}-${s.key}`}>
                <Rect
                  x={x}
                  y={y}
                  width={w}
                  height={barH}
                  rx={r}
                  fill={s.color}
                  opacity={0.9}
                />
                {meta && w > 35 && (
                  <SvgText
                    x={x + 8}
                    y={y + barH / 2 + 3.5}
                    fill={s.metaColor || colors.background}
                    fontSize={8}
                    fontFamily={Fonts.bold}
                    pointerEvents="none"
                  >
                    {meta}
                  </SvgText>
                )}
              </React.Fragment>
            );
          });
        })}

        {/* Reference Line */}
        {isFiniteNumber(referenceValue) && referenceValue > 0 && (
          <Line
            x1={pad.l + innerW * (referenceValue / computedMax)}
            x2={pad.l + innerW * (referenceValue / computedMax)}
            y1={pad.t}
            y2={pad.t + innerH}
            stroke={colors.accentRed}
            strokeWidth={1.5}
            strokeDasharray="4, 4"
          />
        )}

        {/* Max label */}
        <SvgText
          x={pad.l + innerW}
          y={pad.t + innerH - 8}
          fill={rgba(colors.text, 0.45)}
          fontSize={11}
          fontFamily={Fonts.medium}
          textAnchor="end"
        >
          {`max ${computedMax}`}
        </SvgText>

        {/* X-axis tick labels */}
        {ticks.map((t) => {
          const x = pad.l + innerW * t;
          const y = pad.t + innerH + 18;
          const val = Math.round(computedMax * t);
          return (
            <SvgText
              key={`xt-${t}`}
              x={x}
              y={y}
              fill={rgba(colors.text, 0.55)}
              fontSize={11}
              fontFamily={Fonts.medium}
              textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}
            >
              {String(val)}
            </SvgText>
          );
        })}

        {/* If no data */}
        {series.every((s) => s.values.every((v) => !isFiniteNumber(v) || (v as number) <= 0)) ? (
          <SvgText
            x={pad.l + innerW / 2}
            y={pad.t + innerH / 2}
            fill={rgba(colors.text, 0.45)}
            fontSize={12}
            fontFamily={Fonts.medium}
            textAnchor="middle"
          >
            No data yet
          </SvgText>
        ) : null}

        {/* Accent corner marker just to keep visual cohesion */}
        <Rect x={0} y={0} width={4} height={height} fill={colors.secondary} opacity={0.25} />
      </Svg>
    </View>
  );
}


