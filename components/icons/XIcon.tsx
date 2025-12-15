import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { StrokeIconProps } from './types';

export function XIcon({ size = 24, color = '#141B34', strokeWidth = 1.5 }: StrokeIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6.00081 17.9992M17.9992 18L6 6.00085" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}
