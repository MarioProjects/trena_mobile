import { Fonts, rgba } from '@/constants/theme';
import { useTrenaTheme } from '@/hooks/use-theme-context';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Path, Stop, Text as SvgText } from 'react-native-svg';

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return '';
  const p = points;
  let d = `M ${p[0]!.x.toFixed(2)} ${p[0]!.y.toFixed(2)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i]!;
    const p1 = p[i]!;
    const p2 = p[i + 1]!;
    const p3 = p[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export type ExerciseProgressPoint = {
  date: string;
  value: number;
};

export type ExerciseProgressChartProps = {
  width: number;
  height: number;
  data: ExerciseProgressPoint[];
  color?: string;
};

export function ExerciseProgressChart(props: ExerciseProgressChartProps) {
  const { colors } = useTrenaTheme();
  const { width, height, data, color = colors.primary } = props;

  const pad = { l: 30, r: 10, t: 10, b: 20 };
  const innerW = Math.max(0, width - pad.l - pad.r);
  const innerH = Math.max(0, height - pad.t - pad.b);

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Add some breathing room to the Y axis
  const yMin = Math.max(0, minVal - range * 0.1);
  const yMax = maxVal + range * 0.1;
  const yRange = yMax - yMin;

  const points = useMemo(() => {
    if (data.length < 2) return [];
    return data.map((d, i) => {
      const x = pad.l + (i / (data.length - 1)) * innerW;
      const y = pad.t + innerH * (1 - (d.value - yMin) / yRange);
      return { x, y };
    });
  }, [data, innerW, innerH, pad.l, pad.t, yMin, yRange]);

  const linePath = useMemo(() => smoothPath(points), [points]);
  const areaPath = useMemo(() => {
    if (!linePath || !points.length) return '';
    const bottomY = pad.t + innerH;
    const start = points[0]!;
    const end = points[points.length - 1]!;
    return `${linePath} L ${end.x.toFixed(2)} ${bottomY.toFixed(2)} L ${start.x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
  }, [innerH, linePath, points, pad.t]);

  if (data.length < 2) {
    return (
      <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <SvgText fill={rgba(colors.text, 0.4)} fontSize={12} fontFamily={Fonts.medium}>
          Not enough data for chart
        </SvgText>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaFillEx" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* Y Axis labels (subtle) */}
        <SvgText
          x={pad.l - 6}
          y={pad.t + 4}
          fill={rgba(colors.text, 0.4)}
          fontSize={10}
          textAnchor="end"
          fontFamily={Fonts.medium}
        >
          {yMax.toFixed(0)}
        </SvgText>
        <SvgText
          x={pad.l - 6}
          y={pad.t + innerH}
          fill={rgba(colors.text, 0.4)}
          fontSize={10}
          textAnchor="end"
          fontFamily={Fonts.medium}
        >
          {yMin.toFixed(0)}
        </SvgText>

        {/* area */}
        {areaPath ? <Path d={areaPath} fill="url(#areaFillEx)" /> : null}

        {/* baseline */}
        <Line
          x1={pad.l}
          x2={pad.l + innerW}
          y1={pad.t + innerH}
          y2={pad.t + innerH}
          stroke={rgba(colors.text, 0.12)}
          strokeWidth={1}
        />

        {/* the line */}
        {linePath ? (
          <>
            <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" />
            {/* data points */}
            {points.map((p, i) => (
              <Path
                key={`dot-${i}`}
                d={`M ${p.x - 2} ${p.y} A 2 2 0 1 1 ${p.x + 2} ${p.y} A 2 2 0 1 1 ${p.x - 2} ${p.y}`}
                fill={color}
              />
            ))}
          </>
        ) : null}
      </Svg>
    </View>
  );
}

