import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Grid,
  Compass,
  MapPin,
  CheckCircle2,
  Clock,
  AlertOctagon,
  ShieldCheck,
  FileCode,
  Layers,
  ArrowDown,
  ArrowUp,
  Lock,
} from 'lucide-react';
import { DAGNode, DAGEdge, NodeStatus, ModelStoreState } from '../../types/dag';
import { modelStore } from '../../store/ModelStore';
import { generateBezierPath, getDependencyLineage, computeDAGLayout } from '../../services/dagLayout';

interface DAGCanvasProps {
  state: ModelStoreState;
}

export const DAGCanvas: React.FC<DAGCanvasProps> = ({ state }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { graph, selectedNodeId, hoveredNodeId, settings } = state;
  const isLocked = graph.isLocked;

  // Viewport Pan & Zoom state
  const [transform, setTransform] = useState<{ x: number; y: number; zoom: number }>({
    x: 400,
    y: 100,
    zoom: 0.9,
  });

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Upstream / Downstream lineage for highlighting
  const lineage = useMemo(() => {
    return getDependencyLineage(selectedNodeId, graph.edges);
  }, [selectedNodeId, graph.edges]);

  // Node maps for fast lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, DAGNode>();
    for (const n of graph.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [graph.nodes]);

  // Fit to screen calculation
  const fitView = useCallback(() => {
    if (!containerRef.current || graph.nodes.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const n of graph.nodes) {
      const w = n.width || 220;
      const h = n.height || 100;
      minX = Math.min(minX, n.position.x - w / 2);
      minY = Math.min(minY, n.position.y - h / 2);
      maxX = Math.max(maxX, n.position.x + w / 2);
      maxY = Math.max(maxY, n.position.y + h / 2);
    }

    const graphW = Math.max(200, maxX - minX + 120);
    const graphH = Math.max(200, maxY - minY + 120);

    const zoom = Math.min(Math.max(0.3, Math.min(rect.width / graphW, rect.height / graphH) * 0.85), 1.5);
    const centerX = rect.width / 2 - ((minX + maxX) / 2) * zoom;
    const centerY = rect.height / 2 - ((minY + maxY) / 2) * zoom;

    setTransform({ x: centerX, y: centerY, zoom });
  }, [graph.nodes]);

  // Fit view on initial load or node count change
  useEffect(() => {
    if (graph.nodes.length > 0) {
      fitView();
    }
  }, [graph.id]);

  // Mouse Wheel for Zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(0.2, transform.zoom * zoomFactor), 2.5);

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centered around mouse point
    const newX = mouseX - (mouseX - transform.x) * (newZoom / transform.zoom);
    const newY = mouseY - (mouseY - transform.y) * (newZoom / transform.zoom);

    setTransform({ x: newX, y: newY, zoom: newZoom });
  };

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking on background
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'canvas-bg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      }));
    } else if (draggingNodeId) {
      // Dragging a node
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = (e.clientX - rect.left - transform.x) / transform.zoom;
      const mouseY = (e.clientY - rect.top - transform.y) / transform.zoom;

      modelStore.updateNodePosition(draggingNodeId, {
        x: Math.round(mouseX - dragOffset.x),
        y: Math.round(mouseY - dragOffset.y),
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag Initiation
  const handleNodeMouseDown = (e: React.MouseEvent, node: DAGNode) => {
    e.stopPropagation();
    modelStore.setSelectedNode(node.id);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = (e.clientX - rect.left - transform.x) / transform.zoom;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.zoom;

    setDraggingNodeId(node.id);
    setDragOffset({
      x: mouseX - node.position.x,
      y: mouseY - node.position.y,
    });
  };

  const getStatusBadge = (status: NodeStatus) => {
    switch (status) {
      case 'COMPLETE':
        return { label: 'COMPLETE', bg: 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300', icon: CheckCircle2 };
      case 'VERIFIED':
        return { label: 'VERIFIED', bg: 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300', icon: ShieldCheck };
      case 'IN_PROGRESS':
        return { label: 'IN PROGRESS', bg: 'bg-blue-950/70 border-blue-500/60 text-blue-300', icon: Clock };
      case 'BLOCKED':
        return { label: 'BLOCKED', bg: 'bg-rose-950/70 border-rose-500/60 text-rose-300', icon: AlertOctagon };
      default:
        return { label: 'DRAFT', bg: 'bg-slate-900 border-slate-700 text-slate-400', icon: Clock };
    }
  };

  return (
    <div
      ref={containerRef}
      id="canvas-bg"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`relative w-full h-full overflow-hidden select-none cursor-grab active:cursor-grabbing ${
        settings.showGrid ? 'dag-canvas-grid' : 'dag-canvas-bg'
      }`}
    >
      {/* Viewport Canvas Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-lg shadow-xl">
        <button
          onClick={() => setTransform((prev) => ({ ...prev, zoom: Math.min(2.5, prev.zoom * 1.2) }))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransform((prev) => ({ ...prev, zoom: Math.max(0.2, prev.zoom * 0.8) }))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={fitView}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTransform({ x: 300, y: 100, zoom: 1 })}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Reset Zoom (100%)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800 my-auto" />
        <span className="text-[11px] font-mono text-slate-400 px-2">
          {Math.round(transform.zoom * 100)}%
        </span>
      </div>

      {/* Mode / Freeze Invariant Pill in Top Right of Canvas */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        {isLocked && (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-md bg-slate-950/90 border border-slate-800 text-[11px] font-mono text-slate-300 backdrop-blur-md shadow-lg">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>Freeze Invariant Enforced</span>
          </div>
        )}
      </div>

      {/* SVG Canvas for Edges and SVG Nodes */}
      <svg
        ref={svgRef}
        className="w-full h-full pointer-events-none"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          {/* Arrow markers */}
          <marker
            id="arrow-default"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
          </marker>
          <marker
            id="arrow-active-upstream"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
          </marker>
          <marker
            id="arrow-active-downstream"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
          </marker>

          {/* Glow filter */}
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Render Directed Edges */}
        <g className="edges-layer">
          {graph.edges.map((edge) => {
            const src = nodeMap.get(edge.source);
            const tgt = nodeMap.get(edge.target);
            if (!src || !tgt) return null;

            const isUpstream = lineage.activeEdgeIds.has(edge.id) && lineage.upstreamIds.has(edge.source);
            const isDownstream = lineage.activeEdgeIds.has(edge.id) && lineage.downstreamIds.has(edge.target);
            const isDirectlyConnected =
              edge.source === selectedNodeId || edge.target === selectedNodeId;

            const { path, midX, midY } = generateBezierPath(
              src.position,
              tgt.position,
              settings.layoutDirection
            );

            let strokeColor = '#334155';
            let strokeWidth = 1.5;
            let marker = 'url(#arrow-default)';

            if (isDirectlyConnected || isUpstream) {
              strokeColor = '#06b6d4';
              strokeWidth = 2.5;
              marker = 'url(#arrow-active-upstream)';
            } else if (isDownstream) {
              strokeColor = '#f59e0b';
              strokeWidth = 2.5;
              marker = 'url(#arrow-active-downstream)';
            } else if (selectedNodeId) {
              strokeColor = '#1e293b';
            }

            return (
              <g key={edge.id} className="transition-all duration-150">
                {/* Background fat stroke for hover target */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className="pointer-events-auto cursor-pointer"
                  onClick={() => {
                    modelStore.setSelectedNode(edge.target);
                  }}
                />
                {/* Visual Line */}
                <path
                  d={path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  markerEnd={marker}
                  className={isDirectlyConnected ? 'stroke-dash-animated' : ''}
                />
                {/* Edge Label Badge */}
                {edge.label && (
                  <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                    <rect
                      x={-40}
                      y={-9}
                      width={80}
                      height={18}
                      rx={4}
                      fill="#090d16"
                      stroke={strokeColor}
                      strokeWidth={1}
                      className="opacity-90"
                    />
                    <text
                      x={0}
                      y={3}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize={9}
                      fontFamily="Fira Code, monospace"
                      className="select-none font-semibold"
                    >
                      {edge.label.length > 14 ? edge.label.substring(0, 12) + '…' : edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* HTML Layer for High-Fidelity Rich Interactive Nodes */}
      <div
        className="absolute inset-0 pointer-events-none origin-top-left"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
        }}
      >
        {graph.nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isUpstream = lineage.upstreamIds.has(node.id);
          const isDownstream = lineage.downstreamIds.has(node.id);
          const isDimmed = selectedNodeId && !isSelected && !isUpstream && !isDownstream;

          const statusBadge = getStatusBadge(node.status);
          const StatusIcon = statusBadge.icon;

          // Dependencies counts
          const inCount = graph.edges.filter((e) => e.target === node.id).length;
          const outCount = graph.edges.filter((e) => e.source === node.id).length;
          const completedReqs = node.requiredItems.filter((i) => i.completed).length;

          const w = node.width || 220;
          const h = node.height || 100;

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onMouseEnter={() => modelStore.setHoveredNode(node.id)}
              onMouseLeave={() => modelStore.setHoveredNode(null)}
              style={{
                width: `${w}px`,
                transform: `translate(${node.position.x - w / 2}px, ${node.position.y - h / 2}px)`,
              }}
              className={`absolute pointer-events-auto rounded-xl select-none transition-shadow duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)] z-30'
                  : isUpstream
                  ? 'bg-slate-900 border-2 border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.2)] z-20'
                  : isDownstream
                  ? 'bg-slate-900 border-2 border-amber-500/70 shadow-[0_0_15px_rgba(245,158,11,0.2)] z-20'
                  : 'bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 shadow-lg z-10'
              } ${isDimmed ? 'opacity-40 hover:opacity-80' : 'opacity-100'}`}
            >
              {/* Card Header: Monospace ID & Status Pill */}
              <div className="px-3 pt-2.5 pb-1 flex items-center justify-between border-b border-slate-800/60">
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      node.type === 'junction'
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        : 'bg-slate-950 text-cyan-400 border border-slate-800'
                    }`}
                  >
                    {node.id}
                  </span>
                  {node.type === 'junction' && (
                    <span className="text-[9px] font-mono text-amber-400 px-1 py-0.2 rounded bg-amber-950/40">
                      JUNC
                    </span>
                  )}
                </div>

                {/* Status pill */}
                <div
                  className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${statusBadge.bg}`}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  <span>{statusBadge.label}</span>
                </div>
              </div>

              {/* Card Body: Component Name & Description */}
              <div className="px-3 py-2">
                <div className="text-xs font-semibold text-slate-100 truncate tracking-tight">
                  {node.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-2 mt-0.5">
                  <span className="uppercase text-slate-500">{node.type}</span>
                  <span>•</span>
                  <span>tier: {node.tier}</span>
                </div>
              </div>

              {/* Card Footer: Dependency Badges & Checklist metrics */}
              <div className="px-3 py-1.5 bg-slate-950/60 rounded-b-xl border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <div className="flex items-center space-x-2">
                  <span
                    className="flex items-center space-x-0.5 text-cyan-400/80"
                    title={`Inbound dependencies: ${inCount}`}
                  >
                    <ArrowDown className="w-2.5 h-2.5" />
                    <span>{inCount}</span>
                  </span>
                  <span
                    className="flex items-center space-x-0.5 text-purple-400/80"
                    title={`Outbound dependents: ${outCount}`}
                  >
                    <ArrowUp className="w-2.5 h-2.5" />
                    <span>{outCount}</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {node.junctionSchema && (
                    <span
                      className="text-amber-400 font-mono text-[9px] flex items-center space-x-0.5 bg-amber-950/50 px-1 rounded border border-amber-900/50"
                      title="Junction Schema Loaded"
                    >
                      <FileCode className="w-2.5 h-2.5" />
                      <span>SCHEMA</span>
                    </span>
                  )}
                  <span
                    className={`font-mono text-[10px] ${
                      completedReqs === node.requiredItems.length && node.requiredItems.length > 0
                        ? 'text-emerald-400 font-bold'
                        : 'text-slate-400'
                    }`}
                    title="Required checklist completion"
                  >
                    {completedReqs}/{node.requiredItems.length} ✓
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas Minimap */}
      {settings.showMinimap && graph.nodes.length > 0 && (
        <div className="absolute bottom-4 right-4 z-20 w-44 h-32 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-2 shadow-2xl pointer-events-none hidden sm:block">
          <div className="text-[9px] font-mono text-slate-500 mb-1 flex items-center justify-between">
            <span>MINIMAP</span>
            <span>{graph.nodes.length} nodes</span>
          </div>
          <div className="relative w-full h-24 bg-slate-900/80 rounded border border-slate-800/60 overflow-hidden">
            {graph.nodes.map((n) => {
              // Normalized small dots
              const nx = Math.min(Math.max(10, (n.position.x / 1400 + 0.5) * 160), 150);
              const ny = Math.min(Math.max(10, (n.position.y / 1000 + 0.5) * 90), 80);
              const isSel = selectedNodeId === n.id;
              return (
                <div
                  key={n.id}
                  style={{ left: `${nx}px`, top: `${ny}px` }}
                  className={`absolute w-2 h-1.5 rounded-sm transform -translate-x-1/2 -translate-y-1/2 ${
                    isSel
                      ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] z-10'
                      : n.type === 'junction'
                      ? 'bg-amber-400'
                      : 'bg-slate-600'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
