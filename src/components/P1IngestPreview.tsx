import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Layers,
  Network,
  Cpu,
  GitBranch,
  ShieldCheck,
} from 'lucide-react';
import { modelStore } from '../store/ModelStore';
import { ModelStoreState } from '../types/dag';

interface P1IngestPreviewProps {
  state: ModelStoreState;
}

export const P1IngestPreview: React.FC<P1IngestPreviewProps> = ({ state }) => {
  const proposal = state.proposal;

  if (!proposal) {
    return (
      <div className="h-[calc(100vh-3.5rem)] flex items-center justify-center text-slate-400 font-mono text-sm">
        No active ingestion proposal. Returning to P0...
        <button
          onClick={() => modelStore.setPhase('P0_EMPTY')}
          className="ml-4 px-3 py-1 bg-slate-800 rounded text-cyan-400"
        >
          Go to P0
        </button>
      </div>
    );
  }

  const { graph, summary, confidence } = proposal;
  const components = graph.nodes.filter((n) => n.type !== 'junction');
  const junctions = graph.nodes.filter((n) => n.type === 'junction');

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-slate-950 p-6 text-slate-100">
      <div className="max-w-5xl mx-auto">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 font-mono text-[11px] mb-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>P1 LIFECYCLE: INGESTION PROPOSAL ENGINE</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Review Proposed Architecture DAG
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Source: {graph.sourceType?.toUpperCase()} • Parsing Confidence: {Math.round(confidence * 100)}%
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => modelStore.setPhase('P0_EMPTY')}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Re-Ingest</span>
            </button>
            <button
              onClick={() => modelStore.acceptProposal()}
              className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <span>Accept & Proceed to P2 Grid</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Components</span>
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-300">{components.length}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Services & Datastores</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center space-x-1.5">
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>Junctions</span>
            </div>
            <div className="text-2xl font-bold font-mono text-amber-300">{junctions.length}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Routers & Decision Gates</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center space-x-1.5">
              <Network className="w-3.5 h-3.5 text-purple-400" />
              <span>Directed Edges</span>
            </div>
            <div className="text-2xl font-bold font-mono text-purple-300">{graph.edges.length}</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">Dependency Connections</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 mb-1 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Topology Guard</span>
            </div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
              {summary.potentialIssues.length === 0 ? 'DAG VALIDATED' : 'CYCLE ALERT'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              {summary.potentialIssues.length === 0 ? 'Kahn Algorithm 0 Cycles' : 'Cyclic edge found'}
            </div>
          </div>
        </div>

        {/* Warning if issues detected */}
        {summary.potentialIssues.length > 0 && (
          <div className="mb-6 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Topology Invariant Notice:</div>
              <ul className="list-disc list-inside mt-1 font-mono text-[11px]">
                {summary.potentialIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Proposed Components & Junctions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Node Catalog */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
                Proposed Components & Junctions ({graph.nodes.length})
              </span>
              <span className="text-[11px] font-mono text-cyan-400">High-Density Monospace IDs</span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
              {graph.nodes.map((node) => (
                <div key={node.id} className="p-3 hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {node.id}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {node.type}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        tier: {node.tier}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-200 mt-1">{node.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                    {node.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edges & Wiring Preview */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
                Discovered Dependency Edges ({graph.edges.length})
              </span>
              <span className="text-[11px] font-mono text-purple-400">Directed Flow</span>
            </div>
            <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
              {graph.edges.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500">
                  No directed edges detected yet. You can wire dependencies in P2.
                </div>
              ) : (
                graph.edges.map((edge) => (
                  <div
                    key={edge.id}
                    className="p-2.5 px-3 flex items-center justify-between text-xs font-mono hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80 text-[11px]">
                        {edge.source}
                      </span>
                      <span className="text-slate-600">➔</span>
                      <span className="text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800/80 text-[11px]">
                        {edge.target}
                      </span>
                    </div>
                    {edge.label && (
                      <span className="text-[10px] text-amber-400/90 bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">
                        {edge.label}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Next Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => modelStore.acceptProposal()}
            className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all"
          >
            <span>Confirm Proposal & Enter P2 Review Grid</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
