import React, { useState } from 'react';
import { X, Copy, Download, Check, FileText, Hash, ShieldCheck } from 'lucide-react';
import { ModelStoreState } from '../types/dag';
import { generateManifestMarkdown, downloadMarkdownFile } from '../services/manifestExport';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: ModelStoreState;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, state }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const markdownContent = generateManifestMarkdown(state.graph, state.envelope);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `${(state.graph.title || 'architecture').toLowerCase().replace(/[^a-z0-9]/g, '-')}-manifest.md`;
    downloadMarkdownFile(markdownContent, filename);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col p-6 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Deterministic Markdown Architecture Manifest
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Checksummed single-file architecture artifact with topological execution sequence.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono flex items-center space-x-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-hidden my-4 bg-slate-950 rounded-xl border border-slate-800/80 p-4 font-mono text-xs text-slate-300">
          <textarea
            readOnly
            value={markdownContent}
            className="w-full h-full bg-transparent resize-none focus:outline-none text-slate-300 font-mono text-xs leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 shrink-0 pt-2 border-t border-slate-800">
          <div className="flex items-center space-x-2 text-cyan-400/80">
            <ShieldCheck className="w-4 h-4" />
            <span>Format: SHA-256 verified Architecture Blueprint</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
