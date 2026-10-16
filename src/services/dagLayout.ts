import { DAGEdge, DAGNode } from '../types/dag';

export interface LayoutOptions {
  direction?: 'TB' | 'LR';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSeparation?: number;
  nodeSeparation?: number;
}

export interface LayoutResult {
  nodes: DAGNode[];
  edges: DAGEdge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
  hasCycles: boolean;
  cycleNodes: string[];
  topologicalOrder: string[];
  layers: Map<number, string[]>;
}

/**
 * Topological Sort & Cycle Detection using Kahn's Algorithm
 */
export function analyzeTopology(nodeIds: string[], edges: DAGEdge[]): {
  isDAG: boolean;
  topologicalOrder: string[];
  cycleNodes: string[];
  inDegrees: Map<string, number>;
  outDegrees: Map<string, number>;
  adjList: Map<string, string[]>;
  revAdjList: Map<string, string[]>;
} {
  const inDegrees = new Map<string, number>();
  const outDegrees = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  const revAdjList = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegrees.set(id, 0);
    outDegrees.set(id, 0);
    adjList.set(id, []);
    revAdjList.set(id, []);
  }

  for (const edge of edges) {
    if (!inDegrees.has(edge.source) || !inDegrees.has(edge.target)) continue;
    inDegrees.set(edge.target, (inDegrees.get(edge.target) || 0) + 1);
    outDegrees.set(edge.source, (outDegrees.get(edge.source) || 0) + 1);
    adjList.get(edge.source)?.push(edge.target);
    revAdjList.get(edge.target)?.push(edge.source);
  }

  // Kahn's algorithm queue
  const queue: string[] = [];
  const inDegreeCopy = new Map(inDegrees);

  for (const [id, deg] of inDegreeCopy.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  const topologicalOrder: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    topologicalOrder.push(u);

    for (const v of adjList.get(u) || []) {
      const newDeg = (inDegreeCopy.get(v) || 0) - 1;
      inDegreeCopy.set(v, newDeg);
      if (newDeg === 0) {
        queue.push(v);
      }
    }
  }

  const isDAG = topologicalOrder.length === nodeIds.length;
  const cycleNodes: string[] = [];
  if (!isDAG) {
    for (const [id, deg] of inDegreeCopy.entries()) {
      if (deg > 0) {
        cycleNodes.push(id);
      }
    }
  }

  return {
    isDAG,
    topologicalOrder,
    cycleNodes,
    inDegrees,
    outDegrees,
    adjList,
    revAdjList,
  };
}

/**
 * Assigns Sugiyama-style layers and arranges nodes into clean 2D coordinates
 */
export function computeDAGLayout(
  nodes: DAGNode[],
  edges: DAGEdge[],
  options: LayoutOptions = {}
): LayoutResult {
  const direction = options.direction || 'TB';
  const nodeWidth = options.nodeWidth || 220;
  const nodeHeight = options.nodeHeight || 100;
  const rankSep = options.rankSeparation || 140;
  const nodeSep = options.nodeSeparation || 60;

  const nodeMap = new Map<string, DAGNode>();
  const nodeIds: string[] = [];
  for (const n of nodes) {
    nodeMap.set(n.id, { ...n });
    nodeIds.push(n.id);
  }

  const { isDAG, topologicalOrder, cycleNodes, inDegrees, adjList } = analyzeTopology(nodeIds, edges);

  // Compute Layer for each node (longest path layering)
  const nodeLayers = new Map<string, number>();
  for (const id of nodeIds) {
    nodeLayers.set(id, 0);
  }

  if (isDAG) {
    for (const u of topologicalOrder) {
      const currentLayer = nodeLayers.get(u) || 0;
      for (const v of adjList.get(u) || []) {
        const nextLayer = Math.max(nodeLayers.get(v) || 0, currentLayer + 1);
        nodeLayers.set(v, nextLayer);
      }
    }
  } else {
    // Fallback if cycles exist: breadth-first leveling
    const visited = new Set<string>();
    const queue: { id: string; layer: number }[] = [];
    for (const id of nodeIds) {
      if ((inDegrees.get(id) || 0) === 0) {
        queue.push({ id, layer: 0 });
        visited.add(id);
      }
    }
    if (queue.length === 0 && nodeIds.length > 0) {
      queue.push({ id: nodeIds[0], layer: 0 });
      visited.add(nodeIds[0]);
    }

    while (queue.length > 0) {
      const { id, layer } = queue.shift()!;
      nodeLayers.set(id, layer);
      for (const neighbor of adjList.get(id) || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, layer: layer + 1 });
        }
      }
    }
  }

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  let maxLayer = 0;
  for (const [id, layer] of nodeLayers.entries()) {
    maxLayer = Math.max(maxLayer, layer);
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(id);
  }

  // Position nodes
  const positionedNodes: DAGNode[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let l = 0; l <= maxLayer; l++) {
    const idsInLayer = layerGroups.get(l) || [];
    const count = idsInLayer.length;
    const totalSpan = count * nodeWidth + (count - 1) * nodeSep;
    const startOffset = -totalSpan / 2 + nodeWidth / 2;

    idsInLayer.forEach((id, idx) => {
      const node = nodeMap.get(id)!;
      let x = 0;
      let y = 0;

      if (direction === 'TB') {
        x = startOffset + idx * (nodeWidth + nodeSep);
        y = l * (nodeHeight + rankSep);
      } else {
        x = l * (nodeWidth + rankSep);
        y = startOffset + idx * (nodeHeight + nodeSep);
      }

      node.position = { x, y };
      node.width = nodeWidth;
      node.height = nodeHeight;
      node.layer = l;

      minX = Math.min(minX, x - nodeWidth / 2);
      minY = Math.min(minY, y - nodeHeight / 2);
      maxX = Math.max(maxX, x + nodeWidth / 2);
      maxY = Math.max(maxY, y + nodeHeight / 2);

      positionedNodes.push(node);
    });
  }

  if (positionedNodes.length === 0) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  return {
    nodes: positionedNodes,
    edges,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(800, maxX - minX + 200),
      height: Math.max(600, maxY - minY + 200),
    },
    hasCycles: !isDAG,
    cycleNodes,
    topologicalOrder,
    layers: layerGroups,
  };
}

/**
 * Calculates a smooth cubic Bézier curve between source and target nodes
 */
export function generateBezierPath(
  source: { x: number; y: number; width?: number; height?: number },
  target: { x: number; y: number; width?: number; height?: number },
  direction: 'TB' | 'LR' = 'TB'
): { path: string; midX: number; midY: number; angle: number } {
  const sw = source.width || 220;
  const sh = source.height || 100;
  const tw = target.width || 220;
  const th = target.height || 100;

  let startX = source.x;
  let startY = source.y;
  let endX = target.x;
  let endY = target.y;

  if (direction === 'TB') {
    // Top-to-bottom: connect bottom port of source to top port of target
    startY = source.y + sh / 2;
    endY = target.y - th / 2;

    const dy = Math.max(40, (endY - startY) * 0.5);
    const cp1x = startX;
    const cp1y = startY + dy;
    const cp2x = endX;
    const cp2y = endY - dy;

    const path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    const midX = 0.5 * (startX + endX);
    const midY = 0.5 * (startY + endY);
    const angle = Math.atan2(endY - cp2y, endX - cp2x) * (180 / Math.PI);

    return { path, midX, midY, angle };
  } else {
    // Left-to-right: connect right port of source to left port of target
    startX = source.x + sw / 2;
    endX = target.x - tw / 2;

    const dx = Math.max(40, (endX - startX) * 0.5);
    const cp1x = startX + dx;
    const cp1y = startY;
    const cp2x = endX - dx;
    const cp2y = endY;

    const path = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
    const midX = 0.5 * (startX + endX);
    const midY = 0.5 * (startY + endY);
    const angle = Math.atan2(endY - cp2y, endX - cp2x) * (180 / Math.PI);

    return { path, midX, midY, angle };
  }
}

/**
 * Finds all upstream (ancestor) and downstream (descendant) node IDs for a given node
 */
export function getDependencyLineage(
  selectedId: string | null,
  edges: DAGEdge[]
): {
  upstreamIds: Set<string>;
  downstreamIds: Set<string>;
  activeEdgeIds: Set<string>;
} {
  const upstreamIds = new Set<string>();
  const downstreamIds = new Set<string>();
  const activeEdgeIds = new Set<string>();

  if (!selectedId) {
    return { upstreamIds, downstreamIds, activeEdgeIds };
  }

  // Reverse adjacency map (target -> sources)
  const incomingMap = new Map<string, { source: string; edgeId: string }[]>();
  // Forward adjacency map (source -> targets)
  const outgoingMap = new Map<string, { target: string; edgeId: string }[]>();

  for (const edge of edges) {
    if (!incomingMap.has(edge.target)) incomingMap.set(edge.target, []);
    incomingMap.get(edge.target)!.push({ source: edge.source, edgeId: edge.id });

    if (!outgoingMap.has(edge.source)) outgoingMap.set(edge.source, []);
    outgoingMap.get(edge.source)!.push({ target: edge.target, edgeId: edge.id });
  }

  // Traverse Upstream (Ancestors)
  const upQueue = [selectedId];
  while (upQueue.length > 0) {
    const curr = upQueue.shift()!;
    for (const item of incomingMap.get(curr) || []) {
      if (!upstreamIds.has(item.source)) {
        upstreamIds.add(item.source);
        activeEdgeIds.add(item.edgeId);
        upQueue.push(item.source);
      }
    }
  }

  // Traverse Downstream (Descendants)
  const downQueue = [selectedId];
  while (downQueue.length > 0) {
    const curr = downQueue.shift()!;
    for (const item of outgoingMap.get(curr) || []) {
      if (!downstreamIds.has(item.target)) {
        downstreamIds.add(item.target);
        activeEdgeIds.add(item.edgeId);
        downQueue.push(item.target);
      }
    }
  }

  return { upstreamIds, downstreamIds, activeEdgeIds };
}
