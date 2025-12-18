import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { StrokeIconProps } from './types';

export function SkipStatusIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3V6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M12 18V21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M21 12L18 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M6 12L3 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M18.3635 5.63672L16.2422 7.75804" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M7.75804 16.2422L5.63672 18.3635" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M18.3635 18.3635L16.2422 16.2422" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path d="M7.75804 7.75804L5.63672 5.63672" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}


