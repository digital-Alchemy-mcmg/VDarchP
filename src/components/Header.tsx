import React, { useState } from 'react';
import {
  FileCode2,
  Lock,
  Unlock,
  RotateCcw,
  RotateCw,
  Download,
  Settings as SettingsIcon,
  Sparkles,
  PlusCircle,
  AlertTriangle,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { LifecyclePhase, ModelStoreState } from '../types/dag';
import { modelStore } from '../store/ModelStore';
import { SAMPLE_STARTER_DAGS, parseMermaidToDAG } from '../services/parser';

interface HeaderProps {
  state: ModelStoreState;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onInitiateLock: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  onOpenSettings,
  onOpenExport,
  onInitiateLock,
}) => {
  const [sampleMenuOpen, setSampleMenuOpen] = useState(false);
  const isLocked = state.graph.isLocked;

  const loadSample = (key: keyof typeof SAMPLE_STARTER_DAGS) => {
    try {
      const source = SAMPLE_STARTER_DAGS[key];
      const proposal = parseMermaidToDAG(source);
      modelStore.setProposal(proposal);
      setSampleMenuOpen(false);
    } catch (err: any) {
      alert(`Failed to load sample: ${err.message}`);
    }
  };

  const phases: { id: LifecyclePhase; label: string; number: string }[] = [
    { id: 'P0_EMPTY', label: 'Ingest Source', number: 'P0' },
    { id: 'P1_INGEST', label: 'Review Proposal', number: 'P1' },
    { id: 'P2_CONFIRM_EDIT', label: 'Confirm Topology', number: 'P2' },
    { id: 'P3_LOCKED_ANNOTATED', label: 'Locked & Annotated', number: 'P3' },
  ];

  const currentPhaseIndex = phases.findIndex((p) => p.id === state.phase);

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & App Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            DAG
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-100 text-sm tracking-tight">
                {state.graph.title || 'SPA DAG Canvas'}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                v{state.graph.version}.0
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2">
              <span>{state.graph.nodes.length} nodes</span>
              <span>•</span>
              <span>{state.graph.edges.length} edges</span>
            </div>
          </div>
        </div>

        {/* Freeze Invariant Badge */}
        <div className="pl-3 border-l border-slate-800 hidden sm:flex items-center">
          {isLocked ? (
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs font-mono font-medium shadow-[0_0_10px_rgba(244,63,94,0.15)]"
              title="Freeze Invariant Active: Graph topology cannot be altered. Edits are restricted to annotations."
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>TOPOLOGY FROZEN</span>
            </div>
          ) : (
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-mono"
              title="Topology is mutable. Advance to P3 to freeze topology forever."
            >
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>MUTABLE TOPOLOGY</span>
            </div>
          )}
        </div>
      </div>

      {/* Phase Stepper */}
      <div className="hidden md:flex items-center space-x-1 bg-slate-900/90 border border-slate-800/80 p-1 rounded-lg">
        {phases.map((phase, idx) => {
          const isActive = state.phase === phase.id;
          const isPassed = currentPhaseIndex > idx;
          return (
            <button
              key={phase.id}
              onClick={() => {
                if (phase.id === 'P3_LOCKED_ANNOTATED' && !isLocked) {
                  onInitiateLock();
                } else if (!isLocked || phase.id === 'P3_LOCKED_ANNOTATED') {
                  modelStore.setPhase(phase.id);
                }
              }}
              disabled={isLocked && phase.id !== 'P3_LOCKED_ANNOTATED'}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : isPassed
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-400'
              } ${isLocked && phase.id !== 'P3_LOCKED_ANNOTATED' ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <span
                className={`font-mono text-[10px] px-1 py-0.2 rounded ${
                  isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {phase.number}
              </span>
              <span>{phase.label}</span>
              {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5">
          <button
            onClick={() => modelStore.undo()}
            disabled={state.history.length === 0}
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded"
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => modelStore.redo()}
            disabled={state.future.length === 0}
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors rounded"
            title="Redo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Starter Architectures Dropdown */}
        <div className="relative">
          <button
            onClick={() => setSampleMenuOpen(!sampleMenuOpen)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {sampleMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2 py-1 text-[11px] font-mono text-slate-400 border-b border-slate-800/80 mb-1">
                Preset Architectures
              </div>
              <button
                onClick={() => loadSample('ecommerce')}
                className="w-full text-left px-2.5 py-2 rounded text-xs text-slate-200 hover:bg-slate-800/80 transition-colors"
              >
                <div className="font-medium text-cyan-300">E-Commerce Microservices</div>
                <div className="text-[11px] text-slate-400">Cart, Orders, Stripe, Kafka & Redis</div>
              </button>
              <button
                onClick={() => loadSample('etlDataLake')}
                className="w-full text-left px-2.5 py-2 rounded text-xs text-slate-200 hover:bg-slate-800/80 transition-colors"
              >
                <div className="font-medium text-emerald-300">Data Lake Ingestion DAG</div>
                <div className="text-[11px] text-slate-400">IoT, Flink, Bronze Lakehouse, dbt</div>
              </button>
              <button
                onClick={() => loadSample('zeroTrustAuth')}
                className="w-full text-left px-2.5 py-2 rounded text-xs text-slate-200 hover:bg-slate-800/80 transition-colors"
              >
                <div className="font-medium text-purple-300">Zero-Trust Identity Enclave</div>
                <div className="text-[11px] text-slate-400">Envoy, OPA Gate, HashiVault, mTLS</div>
              </button>
            </div>
          )}
        </div>

        {/* Lock Button if in P2 */}
        {state.phase === 'P2_CONFIRM_EDIT' && !isLocked && (
          <button
            onClick={onInitiateLock}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-[0_0_12px_rgba(225,29,72,0.3)] transition-all animate-pulse"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Topology</span>
          </button>
        )}

        {/* Export Manifest */}
        <button
          onClick={onOpenExport}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white text-xs transition-colors"
          title="Export Manifest Markdown Specification"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Settings & Gemini API Key"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
