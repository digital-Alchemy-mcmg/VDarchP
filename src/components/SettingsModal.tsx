import React from 'react';
import {
  X,
  Sliders,
  Trash2,
  Compass,
  Grid,
  Map,
} from 'lucide-react';
import { modelStore } from '../store/ModelStore';
import { ModelStoreState } from '../types/dag';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: ModelStoreState;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, state }) => {
  if (!isOpen) return null;

  const handleClearAll = () => {
    if (confirm('Are you sure you want to completely reset the dashboard? All local DAG state will be cleared.')) {
      modelStore.resetToEmpty();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Dashboard Settings</h2>
          </div>
          <button
            aria-label="Close settings"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Canvas Preferences */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
              Canvas Preferences
            </span>

            {/* Layout Direction */}
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-mono text-slate-300 flex items-center space-x-2">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                <span>Layout Orientation</span>
              </span>
              <div className="bg-slate-950 border border-slate-800 rounded p-0.5 flex">
                <button
                  type="button"
                  onClick={() => modelStore.updateSettings({ layoutDirection: 'TB' })}
                  className={`px-2 py-0.5 text-xs font-mono rounded ${
                    state.settings.layoutDirection === 'TB'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Top-Down (TB)
                </button>
                <button
                  type="button"
                  onClick={() => modelStore.updateSettings({ layoutDirection: 'LR' })}
                  className={`px-2 py-0.5 text-xs font-mono rounded ${
                    state.settings.layoutDirection === 'LR'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Left-Right (LR)
                </button>
              </div>
            </div>

            {/* Toggle Grid */}
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-mono text-slate-300 flex items-center space-x-2">
                <Grid className="w-3.5 h-3.5 text-slate-400" />
                <span>Show Canvas Grid</span>
              </span>
              <input
                type="checkbox"
                checked={state.settings.showGrid}
                onChange={(e) => modelStore.updateSettings({ showGrid: e.target.checked })}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
            </div>

            {/* Toggle Minimap */}
            <div className="flex items-center justify-between py-1">
              <span className="text-xs font-mono text-slate-300 flex items-center space-x-2">
                <Map className="w-3.5 h-3.5 text-slate-400" />
                <span>Show Minimap</span>
              </span>
              <input
                type="checkbox"
                checked={state.settings.showMinimap}
                onChange={(e) => modelStore.updateSettings({ showMinimap: e.target.checked })}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Reset / Purge State */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono text-rose-400 font-semibold">Reset Architecture</div>
              <div className="text-[10px] text-slate-500 font-mono">Wipe localStorage model</div>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center space-x-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset State</span>
            </button>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
