import React, { useState, useSyncExternalStore, useRef } from 'react';
import { modelStore } from './store/ModelStore';
import { Header } from './components/Header';
import { P0EmptyDropzone } from './components/P0EmptyDropzone';
import { P1IngestPreview } from './components/P1IngestPreview';
import { P2ReviewGrid } from './components/P2ReviewGrid';
import { DAGCanvas } from './components/canvas/DAGCanvas';
import { LowerInspector } from './components/inspector/LowerInspector';
import { LockWarningModal } from './components/LockWarningModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { GripHorizontal } from 'lucide-react';

const subscribe = (listener: () => void) => modelStore.subscribe(listener);
const getSnapshot = () => modelStore.getState();

export default function App() {
  const state = useSyncExternalStore(subscribe, getSnapshot);

  // Modal visibility states
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Split-pane resizer for P3 (Upper Viewport vs Lower Inspector)
  const [splitHeightPct, setSplitHeightPct] = useState(60); // 60% Upper Canvas, 40% Lower Inspector
  const isDraggingSplitter = useRef(false);

  // Splitter mouse handlers
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSplitter.current) return;
      const totalH = window.innerHeight - 56; // minus header height
      const currentY = moveEvent.clientY - 56;
      const pct = Math.min(Math.max(25, (currentY / totalH) * 100), 80);
      setSplitHeightPct(pct);
    };

    const handleMouseUp = () => {
      isDraggingSplitter.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Header */}
      <Header
        state={state}
        onOpenExport={() => setShowExportModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onInitiateLock={() => setShowLockWarning(true)}
      />

      {/* Main Content Area based on Lifecycle Phase */}
      <main className="flex-1 relative overflow-hidden">
        {state.phase === 'P0_EMPTY' && (
          <P0EmptyDropzone
            state={state}
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        )}

        {state.phase === 'P1_INGEST' && (
          <P1IngestPreview state={state} />
        )}

        {state.phase === 'P2_CONFIRM_EDIT' && (
          <P2ReviewGrid
            state={state}
            onInitiateLock={() => setShowLockWarning(true)}
          />
        )}

        {state.phase === 'P3_LOCKED_ANNOTATED' && (
          <div className="h-full w-full flex flex-col overflow-hidden">
            {/* Upper Viewport: Interactive Pan/Zoom DAG Canvas */}
            <section aria-label="DAG Canvas Viewport" style={{ height: `${splitHeightPct}%` }} className="w-full relative overflow-hidden">
              <DAGCanvas state={state} />
            </section>

            {/* Resizable Divider between Upper Viewport and Lower Inspector */}
            <div
              onMouseDown={handleSplitterMouseDown}
              className="h-2 bg-slate-900 hover:bg-cyan-950/70 border-y border-slate-800 cursor-row-resize flex items-center justify-center transition-colors group shrink-0"
              title="Drag to resize Canvas vs Inspector"
            >
              <GripHorizontal className="w-4 h-4 text-slate-600 group-hover:text-cyan-400" />
            </div>

            {/* Lower Viewport: Reactive Control Panel / Deep Inspector */}
            <div style={{ height: `${100 - splitHeightPct}%` }} className="w-full overflow-hidden">
              <LowerInspector state={state} />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <LockWarningModal
        isOpen={showLockWarning}
        onClose={() => setShowLockWarning(false)}
        onConfirm={() => setShowLockWarning(false)}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        state={state}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        state={state}
      />
    </div>
  );
}
