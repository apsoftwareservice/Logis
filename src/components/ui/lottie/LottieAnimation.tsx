"use client"

import React from 'react';
import Lottie from 'lottie-react';
import { cn } from '@/lib/utils'


interface LottieAnimationProps {
  animationJson: any
  subtitle?: string
  autoplay?: boolean
  height?: string
  width?: string
  className?: string
  loop?: boolean
}

export function LottieAnimation({animationJson, height = '100%', width = '100%',subtitle = undefined, className = undefined, loop = true, autoplay = true}: LottieAnimationProps) {
  return (
    <div className={ cn("w-full h-full", className) }>
      <Lottie animationData={ animationJson } loop={loop} autoplay={autoplay} style={{ height, width }}/>
      { subtitle ?? (
        <div>{ subtitle }</div>
      ) }
    </div>
  );
}

export default LottieAnimation;
