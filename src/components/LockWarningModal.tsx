import React, { useState } from 'react';
import { AlertTriangle, Lock, ShieldAlert, X } from 'lucide-react';
import { modelStore } from '../store/ModelStore';

interface LockWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LockWarningModal: React.FC<LockWarningModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);

  if (!isOpen) return null;

  const handleCommitLock = () => {
    if (!confirmCheckbox) return;
    modelStore.lockTopologyForever();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-950 border-2 border-rose-600 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-[0_0_50px_rgba(225,29,72,0.3)] animate-in fade-in zoom-in-95 duration-200 text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-600/50 flex items-center justify-center text-rose-500 mb-5 shadow-[0_0_20px_rgba(225,29,72,0.3)]">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-2">
          Locking freezes graph topology forever.
        </h2>

        {/* Invariant Description */}
        <div className="text-xs sm:text-sm text-slate-300 space-y-2.5 font-sans leading-relaxed mb-6">
          <p>
            You are about to transition this architecture into <strong className="text-rose-400 font-semibold font-mono">Phase 3 (Locked & Annotated)</strong>.
          </p>
          <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/40 font-mono text-xs text-rose-200">
            <div className="font-semibold text-rose-300 mb-1 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Freeze Invariant Rule:</span>
            </div>
            Structural modifications (adding/removing nodes or edges) will be permanently disallowed and throw hard invariant errors.
          </div>
          <p className="text-slate-400 text-xs">
            In Phase 3, you will proceed to deep inspection: adding artifact links, completing required engineering verification checklists, uploading junction schemas (≤ 256KB), and documenting protocol provenance.
          </p>
        </div>

        {/* Checkbox confirmation */}
        <label className="flex items-start space-x-3 p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:bg-slate-900/80 transition-colors mb-6">
          <input
            type="checkbox"
            checked={confirmCheckbox}
            onChange={(e) => setConfirmCheckbox(e.target.checked)}
            className="mt-0.5 rounded bg-slate-950 border-slate-700 text-rose-600 focus:ring-rose-500"
          />
          <span className="text-xs font-mono text-slate-300 select-none">
            I understand that locking permanently freezes graph topology forever.
          </span>
        </label>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel (Keep Mutable)
          </button>
          <button
            onClick={handleCommitLock}
            disabled={!confirmCheckbox}
            className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-semibold flex items-center space-x-2 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            <span>Freeze & Lock Topology Forever</span>
          </button>
        </div>
      </div>
    </div>
  );
};
