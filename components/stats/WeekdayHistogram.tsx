import { Fonts, TrenaColors } from '@/constants/theme';
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Line, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

function smoothPath(points: Array<{ x: number; y: number }>) {
  // Catmull-Rom -> Bezier, simple + good-looking for small n
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

export type WeekdayHistogramProps = {
  width: number;
  height: number;
  counts: number[]; // len=7
  density?: number[]; // len=7, 0..1
  labels?: string[]; // len=7
  barColor?: string;
  lineColor?: string;
  highlightIndex?: number; // 0..6
};

export function WeekdayHistogram(props: WeekdayHistogramProps) {
  const {
    width,
    height,
    counts,
    density,
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    barColor = TrenaColors.secondary,
    lineColor = 'rgba(236, 235, 228, 0.9)',
    highlightIndex,
  } = props;

  const pad = { l: 6, r: 6, t: 10, b: 22 };
  const innerW = Math.max(0, width - pad.l - pad.r);
  const innerH = Math.max(0, height - pad.t - pad.b);

  const maxCount = Math.max(1, ...counts.map((c) => (Number.isFinite(c) ? c : 0)));
  const barW = innerW / 7;

  const linePoints = useMemo(() => {
    if (!density || density.length !== 7) return [];
    return density.map((d, i) => {
      const x = pad.l + barW * (i + 0.5);
      const y = pad.t + innerH * (1 - clamp01(d));
      return { x, y };
    });
  }, [density, barW, innerH, pad.l, pad.t]);

  const linePath = useMemo(() => smoothPath(linePoints) || buildLinePath(linePoints), [linePoints]);
  const areaPath = useMemo(() => {
    if (!linePath || !linePoints.length) return '';
    const bottomY = pad.t + innerH;
    const start = linePoints[0]!;
    const end = linePoints[linePoints.length - 1]!;
    return `${linePath} L ${end.x.toFixed(2)} ${bottomY.toFixed(2)} L ${start.x.toFixed(2)} ${bottomY.toFixed(2)} Z`;
  }, [innerH, linePath, linePoints, pad.t]);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="histFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={barColor} stopOpacity={0.85} />
            <Stop offset="1" stopColor={barColor} stopOpacity={0.15} />
          </LinearGradient>
          <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={barColor} stopOpacity={0.30} />
            <Stop offset="1" stopColor={barColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>

        {/* density area */}
        {areaPath ? <Path d={areaPath} fill="url(#areaFill)" /> : null}

        {counts.map((c, i) => {
          const val = Number.isFinite(c) ? c : 0;
          const h = innerH * (val / maxCount);
          const x = pad.l + barW * i + barW * 0.15;
          const y = pad.t + (innerH - h);
          const w = barW * 0.7;
          const r = Math.min(10, w / 2);

          return <Rect key={`bar-${i}`} x={x} y={y} width={w} height={h} rx={r} fill="url(#histFill)" />;
        })}

        {/* subtle baseline */}
        <Line
          x1={pad.l}
          x2={pad.l + innerW}
          y1={pad.t + innerH}
          y2={pad.t + innerH}
          stroke="rgba(236, 235, 228, 0.12)"
          strokeWidth={1}
        />

        {linePath ? (
          <>
            {/* subtle glow under the line */}
            <Path d={linePath} stroke="rgba(163, 220, 64, 0.18)" strokeWidth={6} fill="none" />
            <Path d={linePath} stroke={lineColor} strokeWidth={2.5} fill="none" />
          </>
        ) : null}

        {labels.map((lab, i) => {
          const x = pad.l + barW * (i + 0.5);
          const y = pad.t + innerH + 16;
          return (
            <SvgText
              key={`lbl-${i}`}
              x={x}
              y={y}
              fill="rgba(236, 235, 228, 0.7)"
              fontSize={11}
              fontFamily={Fonts.medium}
              textAnchor="middle"
            >
              {lab}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}


