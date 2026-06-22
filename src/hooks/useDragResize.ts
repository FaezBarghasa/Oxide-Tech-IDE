import { useState, useCallback } from 'react';

export function useDragResize(initialSize: number, minSize: number, maxSize: number, isVertical = false, reverse = false) {
  const [size, setSize] = useState(initialSize);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startPos = isVertical ? e.clientY : e.clientX;
    const startSize = size;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = (isVertical ? moveEvent.clientY : moveEvent.clientX) - startPos;
      const newSize = Math.min(Math.max(startSize + (reverse ? -delta : delta), minSize), maxSize);
      setSize(newSize);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [size, minSize, maxSize, isVertical, reverse]);

  return { size, startDrag, setSize };
}
