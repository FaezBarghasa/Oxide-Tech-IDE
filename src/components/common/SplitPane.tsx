import { ReactNode } from 'react';
import { useDragResize } from '../../hooks/useDragResize';

interface SplitPaneProps {
  first: ReactNode;
  second: ReactNode;
  direction?: 'horizontal' | 'vertical';
  initialSize?: number;
  minSize?: number;
  maxSize?: number;
  reverse?: boolean;
}

export function SplitPane({
  first,
  second,
  direction = 'horizontal',
  initialSize = 250,
  minSize = 150,
  maxSize = 600,
  reverse = false,
}: SplitPaneProps) {
  const isVertical = direction === 'vertical';
  const { size, startDrag } = useDragResize(initialSize, minSize, maxSize, isVertical, reverse);

  const style = isVertical ? { height: size } : { width: size };

  return (
    <div className={`flex h-full w-full overflow-hidden select-none ${isVertical ? 'flex-col' : 'flex-row'}`}>
      <div style={!reverse ? style : undefined} className={!reverse ? "overflow-auto flex-shrink-0" : "flex-1 overflow-auto"}>
        {first}
      </div>
      <div
        onMouseDown={startDrag}
        className={`bg-ide-border transition-colors hover:bg-ide-activeTab ${
          isVertical ? 'h-1 w-full cursor-row-resize' : 'w-1 h-full cursor-col-resize'
        }`}
      />
      <div style={reverse ? style : undefined} className={reverse ? "overflow-auto flex-shrink-0" : "flex-1 overflow-auto"}>
        {second}
      </div>
    </div>
  );
}
