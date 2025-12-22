import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import type { StrokeIconProps } from '../types';

export function SadIcon({ size = 24, color = '#141B34', strokeWidth = 1.5 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M8 17C8.91212 15.7856 10.3643 15 12 15C13.6357 15 15.0879 15.7856 16 17"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M8.00897 9H8M16 9H15.991" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
