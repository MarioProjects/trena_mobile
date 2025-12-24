import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import type { StrokeIconProps } from './types';

export function InfoIcon({ size = 24, color = 'currentColor', strokeWidth = 1.5 }: StrokeIconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} />
            <Path d="M12 16V11.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M12 8.01172V8.00172" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}
