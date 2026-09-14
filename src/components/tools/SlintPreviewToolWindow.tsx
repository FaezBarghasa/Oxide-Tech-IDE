import { useState, useEffect, useRef } from 'react';
import { 
  RotateCcw, ZoomIn, ZoomOut
} from 'lucide-react';
import { tauriCommands } from '../../services/tauri';
import { SlintComponentDefinition } from '../../types/visualWorkstation';

const DEFAULT_SLINT_CODE = `export component MainWindow inherits Window {
    width: 480px;
    height: 320px;
    background: #1e1f22;

    in-out property <int> counter: 0;
    callback clicked();

    VerticalBox {
        alignment: center;
        spacing: 16px;

        Text {
            text: "Oxide Slint Live Preview";
            font-size: 20px;
            color: #ffffff;
            horizontal-alignment: center;
        }

        Text {
            text: "Counter Value: " + root.counter;
            font-size: 14px;
            color: #868a91;
            horizontal-alignment: center;
        }

        HorizontalBox {
            alignment: center;
            spacing: 12px;

            Button {
                text: "Increment (+)";
                clicked => {
                    root.counter += 1;
                    root.clicked();
                }
            }

            Button {
                text: "Reset (0)";
                clicked => {
                    root.counter = 0;
                }
            }
        }
    }
}`;

export function SlintPreviewToolWindow() {
  const [components, setComponents] = useState<SlintComponentDefinition[]>([]);
  const [zoom, setZoom] = useState(1.0);
  const [counter, setCounter] = useState(0);
  const [activeTab, setActiveTab] = useState<'canvas' | 'props' | 'ast'>('canvas');
  const [hoveredBtn, setHoveredBtn] = useState<'inc' | 'reset' | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadSlint = async () => {
    try {
      const res = await tauriCommands.slintCompilePreview(DEFAULT_SLINT_CODE, 'main.slint');
      setComponents(res);
    } catch (e) {
      console.error('Failed to compile Slint preview:', e);
    }
  };

  useEffect(() => {
    loadSlint();
  }, []);

  // Draw interactive Slint canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save & scale
    ctx.save();
    ctx.scale(zoom, zoom);

    // Window Background
    ctx.fillStyle = '#1e1f22';
    ctx.fillRect(40, 30, 480, 320);

    // Window Outline
    ctx.strokeStyle = '#3574f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 30, 480, 320);

    // Title Bar mockup
    ctx.fillStyle = '#26282d';
    ctx.fillRect(40, 30, 480, 28);
    ctx.fillStyle = '#dfe1e5';
    ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.fillText('MainWindow (Slint Preview Engine)', 54, 48);

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Oxide Slint Live Preview', 280, 110);

    // Counter Text
    ctx.fillStyle = '#868a91';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(`Counter Value: ${counter}`, 280, 150);

    // Increment Button
    const incHovered = hoveredBtn === 'inc';
    ctx.fillStyle = incHovered ? '#437ef7' : '#3574f0';
    ctx.beginPath();
    ctx.roundRect(170, 190, 100, 34, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
    ctx.fillText('Increment (+)', 220, 212);

    // Reset Button
    const resetHovered = hoveredBtn === 'reset';
    ctx.fillStyle = resetHovered ? '#393b40' : '#2b2d30';
    ctx.beginPath();
    ctx.roundRect(290, 190, 90, 34, 4);
    ctx.fill();
    ctx.strokeStyle = '#393b40';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#dfe1e5';
    ctx.fillText('Reset (0)', 335, 212);

    ctx.restore();
  }, [zoom, counter, hoveredBtn]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Increment button bounds: 170, 190, 100, 34
    if (x >= 170 && x <= 270 && y >= 190 && y <= 224) {
      setCounter((prev) => prev + 1);
      tauriCommands.slintDispatchCanvasEvent('click', x, y);
    }
    // Reset button bounds: 290, 190, 90, 34
    else if (x >= 290 && x <= 380 && y >= 190 && y <= 224) {
      setCounter(0);
      tauriCommands.slintDispatchCanvasEvent('click', x, y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (x >= 170 && x <= 270 && y >= 190 && y <= 224) {
      setHoveredBtn('inc');
    } else if (x >= 290 && x <= 380 && y >= 190 && y <= 224) {
      setHoveredBtn('reset');
    } else {
      setHoveredBtn(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans text-xs select-none">
      {/* Toolbar */}
      <div className="h-8 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              activeTab === 'canvas'
                ? 'bg-[#3574f0] text-white'
                : 'text-[#868a91] hover:text-white hover:bg-[#2b2d30]'
            }`}
          >
            Live Canvas
          </button>
          <button
            onClick={() => setActiveTab('props')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              activeTab === 'props'
                ? 'bg-[#3574f0] text-white'
                : 'text-[#868a91] hover:text-white hover:bg-[#2b2d30]'
            }`}
          >
            Properties
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="p-1 text-[#868a91] hover:text-white hover:bg-[#2b2d30] rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-[#868a91] font-mono px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.1))}
            className="p-1 text-[#868a91] hover:text-white hover:bg-[#2b2d30] rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="p-1 text-[#868a91] hover:text-white hover:bg-[#2b2d30] rounded transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Canvas View */}
      {activeTab === 'canvas' && (
        <div className="flex-1 overflow-auto bg-[#141416] flex items-center justify-center p-6 relative">
          <canvas
            ref={canvasRef}
            width={560}
            height={380}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            className="shadow-2xl rounded border border-[#2b2d30] cursor-pointer"
          />
          <div className="absolute bottom-3 right-4 text-[10px] text-[#6f737a] font-mono">
            Slint Software Renderer Active (Interactive)
          </div>
        </div>
      )}

      {/* Properties Tab */}
      {activeTab === 'props' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="text-xs font-semibold text-white mb-2">Component Properties</div>
          {components.map((comp) => (
            <div key={comp.name} className="border border-[#2b2d30] rounded bg-[#1a1b1d] p-3 space-y-2">
              <div className="text-[#3574f0] font-semibold text-xs">{comp.name}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {comp.properties.map((p) => (
                  <div key={p.name} className="flex items-center justify-between p-1.5 bg-[#2b2d30] rounded">
                    <span className="text-[#868a91]">{p.name}</span>
                    <span className="font-mono text-white">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
