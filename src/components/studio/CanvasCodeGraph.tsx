import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Network, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { SymbolChunk } from '../../types/ast';

interface GraphNode {
  id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  connections: string[];
}

interface CanvasCodeGraphProps {
  symbols?: SymbolChunk[];
  onSelectNode?: (node: GraphNode) => void;
}

export const CanvasCodeGraph: React.FC<CanvasCodeGraphProps> = ({ symbols = [], onSelectNode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [fps, setFps] = useState<number>(120);

  // Generate node topology
  const nodes = React.useMemo<GraphNode[]>(() => {
    if (symbols.length === 0) {
      // Fallback demo topology
      return [
        { id: '1', name: 'TokenixEngine', kind: 'struct', x: 200, y: 150, radius: 24, color: '#38bdf8', connections: ['2', '3'] },
        { id: '2', name: 'slice_context', kind: 'function', x: 380, y: 100, radius: 18, color: '#4ade80', connections: ['4'] },
        { id: '3', name: 'parse_symbols', kind: 'function', x: 380, y: 220, radius: 18, color: '#4ade80', connections: [] },
        { id: '4', name: 'LoopEngine', kind: 'struct', x: 550, y: 100, radius: 22, color: '#f43f5e', connections: ['5'] },
        { id: '5', name: 'OscillationGuard', kind: 'function', x: 720, y: 100, radius: 16, color: '#fbbf24', connections: [] },
        { id: '6', name: 'SwarmDag', kind: 'struct', x: 350, y: 320, radius: 22, color: '#a855f7', connections: ['3'] },
      ];
    }

    return symbols.map((sym, idx) => {
      const angle = (idx / symbols.length) * 2 * Math.PI;
      const radiusDist = 180 + (idx % 3) * 60;
      return {
        id: `sym-${idx}`,
        name: sym.symbol_name,
        kind: sym.kind,
        x: 400 + Math.cos(angle) * radiusDist,
        y: 250 + Math.sin(angle) * radiusDist,
        radius: sym.kind === 'struct' ? 22 : 16,
        color: sym.kind === 'struct' ? '#38bdf8' : sym.kind === 'enum' ? '#a855f7' : '#4ade80',
        connections: idx > 0 ? [`sym-${idx - 1}`] : [],
      };
    });
  }, [symbols]);

  // High-performance canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const render = (time: number) => {
      frameCount++;
      if (time - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (time - lastTime)));
        frameCount = 0;
        lastTime = time;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(scale, scale);

      // 1. Draw Grid Background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      const startX = -offset.x / scale;
      const startY = -offset.y / scale;
      const endX = startX + canvas.width / scale;
      const endY = startY + canvas.height / scale;

      for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }

      // 2. Draw Edges
      const nodeMap = new Map<string, GraphNode>(nodes.map((n) => [n.id, n]));
      nodes.forEach((source) => {
        source.connections.forEach((targetId) => {
          const target = nodeMap.get(targetId);
          if (!target) return;

          ctx.beginPath();
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.lineWidth = 2;
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(target.y - source.y, target.x - source.x);
          const arrowLength = 8;
          const endX = target.x - Math.cos(angle) * target.radius;
          const endY = target.y - Math.sin(angle) * target.radius;

          ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - Math.PI / 6),
            endY - arrowLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + Math.PI / 6),
            endY - arrowLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        });
      });

      // 3. Draw Nodes
      nodes.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;

        // Glow on hover
        if (isHovered) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 16;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.lineWidth = isHovered ? 3 : 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Label
        ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, node.x, node.y + node.radius + 14);

        // Kind pill
        ctx.font = '9px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`[${node.kind}]`, node.x, node.y + node.radius + 25);
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, scale, offset, hoveredNode]);

  // Spatial hit-testing
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - offset.x) / scale;
      const mouseY = (e.clientY - rect.top - offset.y) / scale;

      if (isDragging) {
        setOffset({
          x: e.clientX - rect.left - dragStart.x,
          y: e.clientY - rect.top - dragStart.y,
        });
        return;
      }

      // Fast radius hit check
      const hit = nodes.find((n) => {
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        return dx * dx + dy * dy <= n.radius * n.radius;
      });

      setHoveredNode(hit || null);
    },
    [nodes, scale, offset, isDragging, dragStart]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (hoveredNode) {
      onSelectNode?.(hoveredNode);
    } else {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - rect.left - offset.x,
        y: e.clientY - rect.top - offset.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="relative w-full h-full bg-[#0d1117] overflow-hidden flex flex-col rounded-lg border border-[#30363d]">
      {/* HUD Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d] text-xs text-zinc-300 select-none">
        <div className="flex items-center space-x-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white">AST Topology & Code Graph</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[10px]">
            {fps} FPS (GPU Canvas)
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setScale((s) => Math.min(s * 1.2, 3))}
            className="p-1 hover:bg-[#21262d] rounded text-zinc-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s / 1.2, 0.4))}
            className="p-1 hover:bg-[#21262d] rounded text-zinc-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="p-1 hover:bg-[#21262d] rounded text-zinc-400 hover:text-white"
            title="Reset View"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={900}
        height={450}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Hover Node Badge */}
      {hoveredNode && (
        <div className="absolute bottom-3 left-3 bg-[#161b22]/95 backdrop-blur border border-cyan-500/40 rounded px-3 py-1.5 text-xs shadow-lg text-white font-mono">
          <span className="text-cyan-400">{hoveredNode.kind}</span>: {hoveredNode.name}
        </div>
      )}
    </div>
  );
};
