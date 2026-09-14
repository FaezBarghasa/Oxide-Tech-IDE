import { useState, useEffect } from 'react';
import { 
  Boxes, RefreshCw, Layout, ChevronRight, ChevronDown, 
  Box
} from 'lucide-react';
import { tauriCommands } from '../../services/tauri';
import { IcedWidgetNode } from '../../types/visualWorkstation';

export function IcedInspectorToolWindow() {
  const [tree, setTree] = useState<IcedWidgetNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<IcedWidgetNode | null>(null);
  const [hotReloading, setHotReloading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'root-app': true,
    'main-column': true,
    'controls-row': true,
  });

  const loadTree = async () => {
    try {
      const res = await tauriCommands.icedFetchWidgetTree('.');
      setTree(res);
      if (!selectedNode) setSelectedNode(res);
    } catch (e) {
      console.error('Failed to fetch Iced widget tree:', e);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const handleHotReload = async () => {
    setHotReloading(true);
    try {
      await tauriCommands.icedTriggerHotReload('.');
      await loadTree();
    } catch (e) {
      console.error('Hot reload failed:', e);
    } finally {
      setHotReloading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderWidgetNode = (node: IcedWidgetNode, depth: number = 0) => {
    const isExpanded = !!expandedNodes[node.id];
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={() => setSelectedNode(node)}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          className={`py-1 pr-2 rounded flex items-center justify-between cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[#2e436e] text-white font-medium'
              : 'hover:bg-[#2b2d30] text-[#dfe1e5]'
          }`}
        >
          <div className="flex items-center space-x-1.5 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className="p-0.5 hover:text-white text-[#868a91] cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <Box className="w-3.5 h-3.5 text-[#3574f0] shrink-0" />
            <span className="text-[11.5px] truncate">{node.widget_type}</span>
            <span className="text-[9.5px] text-[#868a91] font-mono truncate">
              #{node.id}
            </span>
          </div>

          <div className="text-[9px] text-[#868a91] font-mono">
            {Math.round(node.bounds[2])}x{Math.round(node.bounds[3])}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>{node.children.map((c) => renderWidgetNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-sans text-xs select-none">
      {/* Top Toolbar */}
      <div className="h-8 border-b border-[#2b2d30] px-3 bg-[#26282d] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Boxes className="w-3.5 h-3.5 text-[#3574f0]" />
          <span className="font-semibold text-white text-[11px]">Iced Native Widget Inspector</span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleHotReload}
            disabled={hotReloading}
            className="flex items-center space-x-1 px-2.5 py-0.5 bg-[#3574f0] hover:bg-[#437ef7] text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${hotReloading ? 'animate-spin' : ''}`} />
            <span>Hot Reload (Instant)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Widget Hierarchy Tree */}
        <div className="w-72 border-r border-[#2b2d30] bg-[#1a1b1d] p-2 overflow-y-auto shrink-0">
          <div className="text-[10px] uppercase font-bold text-[#868a91] tracking-wider mb-2 px-1">
            Widget Hierarchy Tree
          </div>
          {tree ? (
            renderWidgetNode(tree)
          ) : (
            <div className="text-center py-8 text-[#6f737a]">No active Iced session</div>
          )}
        </div>

        {/* Right Layout Box & Properties Inspector */}
        <div className="flex-1 p-4 overflow-y-auto bg-[#1e1f22]">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="border-b border-[#2b2d30] pb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-white">{selectedNode.widget_type}</h3>
                  <span className="px-2 py-0.5 rounded bg-[#2b2d30] text-[10px] font-mono text-[#3574f0]">
                    {selectedNode.id}
                  </span>
                </div>
                <div className="text-[11px] text-[#868a91] mt-1 font-mono">
                  {selectedNode.state_summary}
                </div>
              </div>

              {/* Box Model Dimensions */}
              <div>
                <div className="text-xs font-semibold text-white mb-2 flex items-center space-x-1.5">
                  <Layout className="w-3.5 h-3.5 text-[#3574f0]" />
                  <span>Computed Layout Box</span>
                </div>

                <div className="border border-[#2b2d30] bg-[#1a1b1d] rounded p-4 flex flex-col items-center justify-center">
                  <div className="w-full max-w-[320px] bg-[#2b2d30] border border-[#393b40] rounded p-3 text-center">
                    <div className="text-[10px] text-[#868a91] mb-1">Padding: {selectedNode.padding.join(', ')}</div>
                    <div className="bg-[#1e1f22] border border-[#3574f0]/50 rounded py-3 font-mono text-xs text-white">
                      {selectedNode.bounds[2]}px × {selectedNode.bounds[3]}px
                    </div>
                    <div className="text-[10px] text-[#868a91] mt-1">
                      Spacing: {selectedNode.spacing}px
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[#6f737a] text-xs">
              Select a widget node from the hierarchy tree.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
