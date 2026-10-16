import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Code2,
  ArrowRight,
  AlertCircle,
  FileCode,
  Terminal,
  Cpu,
} from 'lucide-react';
import { modelStore } from '../store/ModelStore';
import { parseMermaidToDAG, parseTextToDAG, SAMPLE_STARTER_DAGS } from '../services/parser';
import { ModelStoreState } from '../types/dag';

interface P0EmptyDropzoneProps {
  state: ModelStoreState;
  onOpenSettings: () => void;
}

export const P0EmptyDropzone: React.FC<P0EmptyDropzoneProps> = ({ state, onOpenSettings }) => {
  const [dragActive, setDragActive] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [mode, setMode] = useState<'upload' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    setError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (!content || !content.trim()) {
          throw new Error('File content is empty.');
        }

        let proposal;
        if (file.name.endsWith('.mmd') || content.includes('graph ') || content.includes('flowchart ')) {
          proposal = parseMermaidToDAG(content);
        } else {
          proposal = parseTextToDAG(content);
        }

        modelStore.setProposal(proposal);
      } catch (err: any) {
        setError(`Failed to parse file: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file from disk.');
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleManualParse = () => {
    if (!textInput.trim()) {
      setError('Please enter architecture specifications or Mermaid code.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const proposal =
        textInput.includes('graph ') || textInput.includes('flowchart ') || textInput.includes('-->')
          ? parseMermaidToDAG(textInput)
          : parseTextToDAG(textInput);
      modelStore.setProposal(proposal);
    } catch (err: any) {
      setError(err.message || 'Parsing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadPreset = (key: keyof typeof SAMPLE_STARTER_DAGS) => {
    try {
      const src = SAMPLE_STARTER_DAGS[key];
      const proposal = parseMermaidToDAG(src);
      modelStore.setProposal(proposal);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-3xl w-full">
        {/* Title & Architecture Subtitle */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 text-xs font-mono mb-4">
            <Terminal className="w-3.5 h-3.5" />
            <span>P0 LIFECYCLE: INGESTION STAGE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            SPA DAG Canvas Dashboard
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Drop your Mermaid diagrams, system specifications, or raw architecture Markdown to parse nodes, junctions, and topologies into a high-density DAG model.
          </p>
        </div>

        {/* Mode switcher: File Drop vs Direct Paste */}
        <div className="flex justify-center mb-6">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-lg flex space-x-1">
            <button
              onClick={() => setMode('upload')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'upload'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>File Dropzone (.mmd, .md, .txt)</span>
            </button>
            <button
              onClick={() => setMode('paste')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                mode === 'paste'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Paste Code / Specs</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-mono">{error}</div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Main Box */}
        {mode === 'upload' ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 bg-slate-900/40 backdrop-blur-sm ${
              dragActive
                ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
                : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mmd,.md,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-800/50 text-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              {isProcessing ? (
                <Cpu className="w-7 h-7 animate-spin text-cyan-300" />
              ) : (
                <UploadCloud className="w-7 h-7" />
              )}
            </div>
            <div className="text-base font-medium text-slate-200 mb-1">
              {isProcessing ? 'Analyzing DAG Topology...' : 'Drop architecture file here or click to browse'}
            </div>
            <p className="text-xs text-slate-500 font-mono mb-4">
              Accepts .mmd (Mermaid DAG), .md (Markdown spec), or raw text specifications
            </p>
            <div className="inline-flex items-center space-x-2 text-xs text-cyan-400 font-medium">
              <span>Select File from Machine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400">
                Mermaid Diagram (.mmd) or System Description:
              </span>
              <button
                onClick={() => setTextInput(SAMPLE_STARTER_DAGS.ecommerce)}
                className="text-[11px] text-cyan-400 hover:underline font-mono"
              >
                Insert Sample Code
              </button>
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`graph TD\n    Client[SPA Client] -->|HTTPS| Gateway{API Gateway}\n    Gateway --> AuthSvc(Auth Service)\n    Gateway --> OrderSvc(Order Service)\n    OrderSvc --> KafkaQueue([Event Bus])\n    OrderSvc --> Postgres[(Database)]`}
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80">
              <div className="text-xs text-slate-500 font-mono">
                <span className="text-slate-500">Local Parser Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleManualParse}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Parse Locally</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Starter Architecture Presets Cards */}
        <div className="mt-8">
          <div className="text-xs font-mono text-slate-400 text-center mb-3">
            Or quick-start with industry architectural benchmarks:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => loadPreset('ecommerce')}
              className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900 text-left transition-all group"
            >
              <div className="font-medium text-xs text-cyan-300 group-hover:text-cyan-200 mb-1 flex items-center justify-between">
                <span>E-Commerce Microservices</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                10 nodes • Gateways, Carts, Stripe, Kafka & Redis
              </p>
            </button>

            <button
              onClick={() => loadPreset('etlDataLake')}
              className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900 text-left transition-all group"
            >
              <div className="font-medium text-xs text-emerald-300 group-hover:text-emerald-200 mb-1 flex items-center justify-between">
                <span>Data Lake Ingestion DAG</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                9 nodes • Telemetry, Flink, Parquet Lakehouse, dbt
              </p>
            </button>

            <button
              onClick={() => loadPreset('zeroTrustAuth')}
              className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900 text-left transition-all group"
            >
              <div className="font-medium text-xs text-purple-300 group-hover:text-purple-200 mb-1 flex items-center justify-between">
                <span>Zero-Trust Identity Enclave</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                8 nodes • Envoy Proxy, OPA, HashiVault, mTLS
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
