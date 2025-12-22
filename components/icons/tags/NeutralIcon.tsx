import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import type { StrokeIconProps } from '../types';

export function NeutralIcon({ size = 24, color = '#141B34', strokeWidth = 1.5 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M8.00897 9H8M16 9H15.991" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 16H15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
