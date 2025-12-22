import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import type { StrokeIconProps } from '../types';

export function BallIcon({ size = 24, color = '#141B34', strokeWidth = 1.5 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M22 13.2644C21.0732 13.0906 20.12 13 19.1472 13C13.7948 13 9.03435 15.7425 6 20"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M19 5C15.8705 8.66742 11.1679 11 5.90962 11C4.56437 11 3.25548 10.8473 2 10.5587"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M14.6178 22C14.8684 20.786 15 19.5287 15 18.2407C15 11.9247 11.8343 6.34645 7 3"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    </Svg>
  );
}

