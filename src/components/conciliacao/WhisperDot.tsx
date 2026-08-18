import React from 'react';
import { PillarDot } from '@/hooks/useReconciliationInsights';

interface WhisperDotProps {
  dot?: PillarDot | null;
  className?: string;
}

export function WhisperDot({ dot, className = '' }: WhisperDotProps) {
  if (!dot) return null;

  const colorClass = dot.severity === 'critical' 
    ? 'bg-rose-400/80 hover:bg-rose-300' 
    : 'bg-amber-400/80 hover:bg-amber-300';

  return (
    <span
      title={dot.tooltip}
      className={`inline-block w-1.5 h-1.5 rounded-full cursor-help transition-opacity duration-200 shrink-0 ${colorClass} ${className}`}
      aria-label={dot.tooltip}
    />
  );
}
