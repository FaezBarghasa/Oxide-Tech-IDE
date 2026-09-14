import { useState, useEffect, useRef } from 'react';
import { 
  Cpu, ZoomIn, ZoomOut, RotateCcw, Activity, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CircleDot
} from 'lucide-react';
import { tauriCommands } from '../../services/tauri';
import { EmbeddedDisplayProfile, EmbeddedSimMetrics } from '../../types/visualWorkstation';

export function EmbeddedSimToolWindow() {
  const [profiles, setProfiles] = useState<EmbeddedDisplayProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('ssd1306_mono');
  const [zoom, setZoom] = useState(2.0);
  const [metrics, setMetrics] = useState<EmbeddedSimMetrics>({
    fps: 30.0,
    frame_time_ms: 33.3,
    vram_used_bytes: 1024,
    total_draw_calls: 142,
  });
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    tauriCommands.embeddedSimGetProfiles().then((p) => {
      setProfiles(p);
      if (p.length > 0) setSelectedProfileId(p[0].id);
    });
  }, []);

  const activeProfile = profiles.find((p) => p.id === selectedProfileId) || {
    id: 'ssd1306_mono',
    name: 'SSD1306 (128x64 Monochrome OLED)',
    width: 128,
    height: 64,
    color_mode: 'monochrome',
    default_fps: 30,
    vram_bytes: 1024,
  };

  useEffect(() => {
    tauriCommands.embeddedSimRenderSample(selectedProfileId).then((m) => setMetrics(m));
  }, [selectedProfileId]);

  // Render Display Hardware Framebuffer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(zoom, zoom);

    // Bezel Border
    ctx.fillStyle = '#0f1012';
    ctx.fillRect(10, 10, activeProfile.width + 16, activeProfile.height + 16);
    ctx.strokeStyle = '#393b40';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, activeProfile.width + 16, activeProfile.height + 16);

    // Display Area
    if (activeProfile.color_mode === 'monochrome') {
      ctx.fillStyle = '#0a0d0a';
      ctx.fillRect(18, 18, activeProfile.width, activeProfile.height);

      // Draw simulated SSD1306 OLED contents (Cyan/Blue pixels)
      ctx.fillStyle = '#4ae6ff';
      ctx.font = '8px monospace';
      ctx.fillText('OXIDE FIRMWARE v1.2', 24, 30);
      ctx.fillText(`Target: STM32F407`, 24, 42);
      ctx.fillText(`VRAM: ${activeProfile.vram_bytes}B [OK]`, 24, 54);

      // Battery / Status Icon
      ctx.strokeStyle = '#4ae6ff';
      ctx.strokeRect(activeProfile.width - 6, 22, 14, 8);
      ctx.fillRect(activeProfile.width + 8, 25, 2, 2);
    } else if (activeProfile.color_mode === 'e-ink') {
      ctx.fillStyle = '#e6e4df';
      ctx.fillRect(18, 18, activeProfile.width, activeProfile.height);

      ctx.fillStyle = '#1e1f22';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('Waveshare e-Paper', 30, 45);

      ctx.fillStyle = '#e06c75';
      ctx.fillText('Tri-Color Red Accents', 30, 70);
    } else {
      // Color ST7789 / ILI9341 RGB565
      ctx.fillStyle = '#14171f';
      ctx.fillRect(18, 18, activeProfile.width, activeProfile.height);

      ctx.fillStyle = '#3574f0';
      ctx.font = 'bold 12px system-ui';
      ctx.fillText('ST7789 IPS Display', 30, 45);

      ctx.fillStyle = '#57a64a';
      ctx.fillRect(30, 60, 80, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px system-ui';
      ctx.fillText('Status: OK', 45, 76);
    }

    ctx.restore();
  }, [activeProfile, zoom]);

  const handleButtonPress = (btn: string) => {
    setActiveButton(btn);
    tauriCommands.embeddedSimInjectInput('default_session', 'button_press', { button: btn });
    setTimeout(() => setActiveButton(null), 200);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans text-xs select-none">
      {/* Top Toolbar */}
      <div className="h-8 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Cpu className="w-3.5 h-3.5 text-[#3574f0]" />
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="bg-[#2b2d30] border border-[#393b40] rounded px-2 py-0.5 text-white text-[11px] focus:outline-none focus:border-[#3574f0]"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(1.0, z - 0.5))}
            className="p-1 text-[#868a91] hover:text-white hover:bg-[#2b2d30] rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-[#868a91] font-mono px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(6.0, z + 0.5))}
            className="p-1 text-[#868a91] hover:text-white hover:bg-[#2b2d30] rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(2.0)}
            className="p-1 text-[#868a91] hover:text-white hover:bg-[#2b2d30] rounded transition-colors cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Hardware Canvas Display */}
        <div className="flex-1 overflow-auto bg-[#0d0e10] flex items-center justify-center p-6 relative">
          <canvas
            ref={canvasRef}
            width={(activeProfile.width + 36) * zoom}
            height={(activeProfile.height + 36) * zoom}
            className="shadow-2xl rounded"
          />
          <div className="absolute bottom-3 left-4 text-[10px] text-[#6f737a] font-mono">
            DrawTarget Trait Emulator: Active
          </div>
        </div>

        {/* Right Hardware Control & Metric Inspector */}
        <div className="w-64 border-l border-[#2b2d30] bg-[#1a1b1d] p-3 flex flex-col space-y-4 shrink-0">
          <div>
            <div className="text-xs font-semibold text-white mb-2 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-[#57a64a]" />
              <span>Real-Time Metrics</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between p-1.5 bg-[#2b2d30] rounded">
                <span className="text-[#868a91]">Frame Rate:</span>
                <span className="font-mono text-[#57a64a] font-bold">{metrics.fps.toFixed(1)} FPS</span>
              </div>
              <div className="flex justify-between p-1.5 bg-[#2b2d30] rounded">
                <span className="text-[#868a91]">Frame Time:</span>
                <span className="font-mono text-white">{metrics.frame_time_ms.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between p-1.5 bg-[#2b2d30] rounded">
                <span className="text-[#868a91]">VRAM Allocation:</span>
                <span className="font-mono text-[#3574f0]">{metrics.vram_used_bytes} Bytes</span>
              </div>
            </div>
          </div>

          {/* D-Pad Hardware Button Controls */}
          <div>
            <div className="text-xs font-semibold text-white mb-2 flex items-center space-x-1.5">
              <CircleDot className="w-3.5 h-3.5 text-[#3574f0]" />
              <span>Hardware Button Injection</span>
            </div>
            <div className="flex flex-col items-center space-y-1.5 pt-1">
              <button
                onClick={() => handleButtonPress('UP')}
                className={`p-2 rounded bg-[#2b2d30] border border-[#393b40] hover:bg-[#3574f0] text-white transition-colors cursor-pointer ${
                  activeButton === 'UP' ? 'bg-[#3574f0]' : ''
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleButtonPress('LEFT')}
                  className={`p-2 rounded bg-[#2b2d30] border border-[#393b40] hover:bg-[#3574f0] text-white transition-colors cursor-pointer ${
                    activeButton === 'LEFT' ? 'bg-[#3574f0]' : ''
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleButtonPress('ACTION')}
                  className={`px-3 py-1.5 rounded bg-[#2b2d30] border border-[#393b40] hover:bg-[#57a64a] text-white text-[10px] font-bold transition-colors cursor-pointer ${
                    activeButton === 'ACTION' ? 'bg-[#57a64a]' : ''
                  }`}
                >
                  OK
                </button>
                <button
                  onClick={() => handleButtonPress('RIGHT')}
                  className={`p-2 rounded bg-[#2b2d30] border border-[#393b40] hover:bg-[#3574f0] text-white transition-colors cursor-pointer ${
                    activeButton === 'RIGHT' ? 'bg-[#3574f0]' : ''
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                onClick={() => handleButtonPress('DOWN')}
                className={`p-2 rounded bg-[#2b2d30] border border-[#393b40] hover:bg-[#3574f0] text-white transition-colors cursor-pointer ${
                  activeButton === 'DOWN' ? 'bg-[#3574f0]' : ''
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
