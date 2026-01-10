import React from 'react';
import Svg, { Circle } from 'react-native-svg';

import type { StrokeIconProps } from './types';

export function StatusIcon({ size = 24, color = '#141B34', strokeWidth = 1.5 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={strokeWidth} strokeDasharray="4 4" />
    </Svg>
  );
}

