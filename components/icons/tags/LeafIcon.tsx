import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { StrokeIconProps } from '../types';

export function LeafIcon({ size = 24, color = '#141B34', strokeWidth = 1.5 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.67504 17.325C3.77499 14.4249 3.77499 9.72297 6.67504 6.82291C10.6133 2.88465 20.459 3.54102 20.459 3.54102C20.459 3.54102 21.1154 13.3867 17.1771 17.325C15.2327 19.2694 12.4783 19.9101 10 19.2472"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3.5 20.5L15.5 8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

