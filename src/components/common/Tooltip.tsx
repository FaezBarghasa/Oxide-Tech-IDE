import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ReactNode } from 'react';

export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="z-50 px-2 py-1 text-xs text-white bg-ide-panel border border-ide-border rounded shadow-md"
            sideOffset={5}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-ide-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
