import React, { useState } from 'react';
import { MousePointer2, Camera, Wand2, Mic } from 'lucide-react';
import { cn } from '../../utils/theme';

export function BrowserPreview() {
  const [annotationMode, setAnnotationMode] = useState(false);
  const [hudPos, setHudPos] = useState<{x: number, y: number} | null>(null);

  const handlePreviewClick = (e: React.MouseEvent) => {
    if (!annotationMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setHudPos({ x, y });
    
    // Task 1.1.2: Coordinate Mapping PostMessage (Mocked)
    console.log(`[Phase 1.1] Querying DOM at X:${x}, Y:${y}. Mapping to AST Node.`);
  };

  const handleCapture = () => {
    // Task 1.2.1: Headless DOM Snapshotting
    console.log("[Phase 1.2] Capturing visible DOM snapshot for AI Vision verification...");
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="h-9 border-b border-zinc-800 flex items-center justify-between px-3 bg-zinc-900 border-t border-t-zinc-800">
        <div className="flex text-xs space-x-2 text-zinc-400">
          <span className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Preview</span>
          <span className="opacity-50">|</span>
          <span className="font-mono text-[10px]">localhost:3000</span>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setAnnotationMode(!annotationMode)}
            className={cn("p-1.5 rounded transition-colors border", annotationMode ? "bg-orange-500/20 text-orange-500 border-orange-500/50" : "text-zinc-500 border-transparent hover:text-zinc-200 hover:bg-zinc-800")}
            title="Spatial Annotation Mode (Pick Element)"
          >
            <MousePointer2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCapture} className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors border border-transparent hover:bg-zinc-800" title="Snapshot DOM">
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden bg-white">
        {/* Mocking the iframe payload execution block */}
        <div className="absolute inset-0 flex items-center justify-center text-zinc-800 flex-col bg-zinc-50">
           <h1 className="text-4xl font-bold tracking-tighter mb-4 text-black">Preview Environment</h1>
           <p className="text-sm font-medium opacity-70 mb-8 max-w-sm text-center">
             This is the sandboxed execution environment. WebContainers are live.
           </p>
           <button className="px-6 py-2.5 bg-black text-white text-sm font-bold tracking-wider rounded-xl hover:scale-105 transition-transform shadow-xl">
             Simulate Interface
           </button>
        </div>
        
        {/* Task 1.1.1: Pointer Interceptor */}
        {annotationMode && (
          <div 
            className="absolute inset-0 cursor-crosshair z-10 bg-orange-500/5"
            onClick={handlePreviewClick}
          />
        )}

        {/* Task 1.1.3: Floating Spatial Annotation HUD */}
        {annotationMode && hudPos && (
          <div 
            className="absolute z-20 bg-zinc-900 border border-zinc-700 shadow-2xl rounded p-2 flex flex-col space-y-2 animate-in fade-in zoom-in-95 duration-150"
            style={{ left: hudPos.x + 10, top: hudPos.y + 10, width: 220 }}
          >
            <div className="text-[10px] uppercase font-bold text-orange-500 tracking-widest flex items-center justify-between">
              <span>Spatial Edit</span>
              <span className="text-zinc-600 font-mono">#btn-primary</span>
            </div>
            <textarea 
              className="w-full h-16 bg-zinc-950 border border-zinc-800 text-xs p-1.5 text-zinc-200 resize-none focus:outline-none focus:border-orange-500/50 rounded" 
              autoFocus
              placeholder="What changes do you need here?" 
            />
            <div className="flex justify-between items-center">
               <button className="p-1 text-zinc-400 hover:text-white bg-zinc-800 rounded"><Mic className="w-3.5 h-3.5" /></button>
               <button className="bg-orange-500 text-black text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded flex items-center">
                 <Wand2 className="w-3 h-3 mr-1" /> Vibe Edit
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
