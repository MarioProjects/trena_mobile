import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { StrokeIconProps } from '../types';

export function BicycleIcon({ size = 24, color = '#141B34', strokeWidth = 1.5 }: StrokeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 19.9986C8.20914 19.9986 10 18.2112 10 16.0063C10 13.8014 8.20914 12.0139 6 12.0139C3.79086 12.0139 2 13.8014 2 16.0063C2 18.2112 3.79086 19.9986 6 19.9986Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18 19.9986C20.2091 19.9986 22 18.2112 22 16.0063C22 13.8014 20.2091 12.0139 18 12.0139C15.7909 12.0139 14 13.8014 14 16.0063C14 18.2112 15.7909 19.9986 18 19.9986Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 16.0062H10.3706C10.7302 16.0062 11.0622 15.8135 11.2399 15.5014L15.5 8.02148"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 13.012L7 7.02344M7 7.02344H5M7 7.02344H9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.0531 15.9709L14.8057 4.03097C16.2565 3.96037 19.3585 3.83085 19.9908 6.21002"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

