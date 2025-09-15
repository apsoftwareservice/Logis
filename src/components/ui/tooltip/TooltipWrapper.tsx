import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip/tooltip'

interface TooltipWrapperProps {
  content?: React.ReactNode;  // The tooltip content
  children: React.ReactNode; // The element that triggers the tooltip
  delayDuration?: number;    // Optional: delay for the tooltip to show
  side?: 'top' | 'right' | 'bottom' | 'left'; // Optional: position of the tooltip
  className?: string;        // Optional: custom class for tooltip content
}

const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
                                                         content,
                                                         children,
                                                         delayDuration = 0,
                                                         side = 'right',
                                                         className = 'flex items-center gap-4',
                                                       }) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={delayDuration}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        {content && (
          <TooltipContent side={side} className={className}>
            {content}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default TooltipWrapper;