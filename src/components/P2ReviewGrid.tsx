import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GitMerge,
  Edit3,
  Lock,
  ArrowRight,
  PlusCircle,
  Network,
  Layers,
  AlertCircle,
  Check,
  X,
  Link2,
} from 'lucide-react';
import { modelStore } from '../store/ModelStore';
import { DAGNode, ModelStoreState, NodeType } from '../types/dag';
import { formatMonospaceId } from '../services/parser';

interface P2ReviewGridProps {
  state: ModelStoreState;
  onInitiateLock: () => void;
}

export const P2ReviewGrid: React.FC<P2ReviewGridProps> = ({ state, onInitiateLock }) => {
  const { graph } = state;
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ id: string; name: string; type: NodeType; tier: DAGNode['tier'] }>({
    id: '',
    name: '',
    type: 'component',
    tier: 'core',
  });

  // Add Node Modal/Drawer
  const [showAddNode, setShowAddNode] = useState(false);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeType>('service');
  const [newNodeTier, setNewNodeTier] = useState<DAGNode['tier']>('core');

  // Merge Modal state
  const [mergingSourceId, setMergingSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // Add Edge state
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [edgeSource, setEdgeSource] = useState('');
  const [edgeTarget, setEdgeTarget] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startEdit = (node: DAGNode) => {
    setEditingNodeId(node.id);
    setEditForm({
      id: node.id,
      name: node.name,
      type: node.type,
      tier: node.tier,
    });
    setErrorMessage(null);
  };

  const saveEdit = (oldId: string) => {
    try {
      modelStore.updateNodeIdentity(oldId, editForm);
      setEditingNodeId(null);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleAddNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim()) return;

    try {
      const generatedId = formatMonospaceId(newNodeName, newNodeType, graph.nodes.length + 1);
      modelStore.addNode({
        id: generatedId,
        name: newNodeName.trim(),
        type: newNodeType,
        tier: newNodeTier,
        description: `Manual architecture component (${newNodeType})`,
        status: 'DRAFT',
        artifacts: [],
        requiredItems: [
          {
            id: `req-${generatedId.toLowerCase()}-1`,
            title: 'Verify contract specifications',
            completed: false,
            category: 'architecture',
          },
        ],
        provenance: {
          interfaceContract: 'REST / OpenAPI',
          protocol: 'HTTPS',
          sla: 'p99 < 50ms',
        },
      });

      setShowAddNode(false);
      setNewNodeName('');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleMerge = () => {
    if (!mergingSourceId || !mergeTargetId || mergingSourceId === mergeTargetId) {
      return;
    }
    try {
      modelStore.mergeNodes(mergingSourceId, mergeTargetId);
      setMergingSourceId(null);
      setMergeTargetId('');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleAddEdge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edgeSource || !edgeTarget || edgeSource === edgeTarget) {
      setErrorMessage('Source and target must be distinct nodes.');
      return;
    }
    try {
      modelStore.addEdge({
        source: edgeSource,
        target: edgeTarget,
        label: edgeLabel.trim() || undefined,
        protocol: 'HTTPS',
      });
      setShowAddEdge(false);
      setEdgeLabel('');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto bg-slate-950 p-6 text-slate-100">
      <div className="max-w-6xl mx-auto">
        {/* Top bar with Warning banner and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 font-mono text-[11px] mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>P2 LIFECYCLE: TOPOLOGY CONFIRMATION GRID</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Visual Review & Topology Editing
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Rename, merge, wire, or delete components before locking topology.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddNode(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Add Node</span>
            </button>
            <button
              onClick={() => setShowAddEdge(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Add Edge</span>
            </button>
            <button
              onClick={onInitiateLock}
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center space-x-2 shadow-[0_0_15px_rgba(225,29,72,0.35)] transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Lock Topology (Freeze Forever)</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between font-mono animate-in fade-in duration-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Topology Review Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl mb-8">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
              Component Registry ({graph.nodes.length} Items)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Double-click or click Edit to modify ID & specs
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-4 font-semibold">Monospace ID</th>
                  <th className="py-2.5 px-4 font-semibold">Component Name</th>
                  <th className="py-2.5 px-4 font-semibold">Type</th>
                  <th className="py-2.5 px-4 font-semibold">Tier</th>
                  <th className="py-2.5 px-4 font-semibold">Inbound</th>
                  <th className="py-2.5 px-4 font-semibold">Outbound</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {graph.nodes.map((node) => {
                  const isEditing = editingNodeId === node.id;
                  const inEdges = graph.edges.filter((e) => e.target === node.id);
                  const outEdges = graph.edges.filter((e) => e.source === node.id);

                  if (isEditing) {
                    return (
                      <tr key={node.id} className="bg-slate-900/90 border-l-2 border-cyan-500">
                        <td className="py-3 px-4 font-mono">
                          <input
                            type="text"
                            value={editForm.id}
                            onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                            className="bg-slate-950 border border-cyan-500/50 rounded px-2 py-1 text-cyan-300 font-mono text-xs w-36"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="bg-slate-950 border border-cyan-500/50 rounded px-2 py-1 text-slate-100 text-xs w-full"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={editForm.type}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value as NodeType })}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                          >
                            <option value="component">component</option>
                            <option value="junction">junction</option>
                            <option value="service">service</option>
                            <option value="datastore">datastore</option>
                            <option value="gateway">gateway</option>
                            <option value="external">external</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={editForm.tier}
                            onChange={(e) => setEditForm({ ...editForm, tier: e.target.value as DAGNode['tier'] })}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                          >
                            <option value="edge">edge</option>
                            <option value="ingress">ingress</option>
                            <option value="core">core</option>
                            <option value="storage">storage</option>
                            <option value="external">external</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{inEdges.length}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{outEdges.length}</td>
                        <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => saveEdit(node.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs inline-flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingNodeId(null)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs inline-flex items-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={node.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                      onDoubleClick={() => startEdit(node)}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-cyan-400">
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                          {node.id}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium">{node.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                            node.type === 'junction'
                              ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                              : node.type === 'datastore'
                              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                              : node.type === 'gateway'
                              ? 'bg-purple-950/40 border-purple-800/50 text-purple-300'
                              : node.type === 'external'
                              ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          {node.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{node.tier}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {inEdges.length} in
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {outEdges.length} out
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => startEdit(node)}
                          className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                          title="Rename / Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setMergingSourceId(node.id);
                            const other = graph.nodes.find((n) => n.id !== node.id);
                            if (other) setMergeTargetId(other.id);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800"
                          title="Merge with another node"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete node '${node.id}'? Associated edges will be pruned.`)) {
                              modelStore.removeNode(node.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          title="Delete node"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Directed Edges List */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
              Directed Dependency Edges ({graph.edges.length})
            </span>
            <button
              onClick={() => setShowAddEdge(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Dependency</span>
            </button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
            {graph.edges.map((edge) => (
              <div
                key={edge.id}
                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs font-mono group"
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="text-cyan-300">{edge.source}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-emerald-300">{edge.target}</span>
                  {edge.label && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[80px]">
                      ({edge.label})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => modelStore.removeEdge(edge.id)}
                  className="text-slate-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove Edge"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Node Modal */}
      {showAddNode && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-white mb-1">Add Topology Node</h2>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Defines a structural component or junction in the DAG.
            </p>

            <form onSubmit={handleAddNode} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  placeholder="e.g. Payment Reconciliation Engine"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Node Type</label>
                  <select
                    value={newNodeType}
                    onChange={(e) => setNewNodeType(e.target.value as NodeType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="component">Component</option>
                    <option value="junction">Junction</option>
                    <option value="service">Service</option>
                    <option value="datastore">Datastore</option>
                    <option value="gateway">Gateway</option>
                    <option value="external">External</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Tier</label>
                  <select
                    value={newNodeTier}
                    onChange={(e) => setNewNodeTier(e.target.value as DAGNode['tier'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="edge">Edge</option>
                    <option value="ingress">Ingress</option>
                    <option value="core">Core</option>
                    <option value="storage">Storage</option>
                    <option value="external">External</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddNode(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
                >
                  Add to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Edge Modal */}
      {showAddEdge && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-white mb-1">Connect Directed Edge</h2>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Establishes a directed flow constraint from Source to Target.
            </p>

            <form onSubmit={handleAddEdge} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Source Node</label>
                <select
                  value={edgeSource}
                  onChange={(e) => setEdgeSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                  required
                >
                  <option value="">Select source...</option>
                  {graph.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.id} ({n.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Target Node</label>
                <select
                  value={edgeTarget}
                  onChange={(e) => setEdgeTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                  required
                >
                  <option value="">Select target...</option>
                  {graph.nodes
                    .filter((n) => n.id !== edgeSource)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} ({n.name})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">
                  Edge Label / Protocol (Optional)
                </label>
                <input
                  type="text"
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  placeholder="e.g. gRPC / JWT Token"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEdge(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
                >
                  Connect Edge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Nodes Modal */}
      {mergingSourceId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center space-x-2">
              <GitMerge className="w-5 h-5 text-amber-400" />
              <span>Merge Components</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Combine <code className="text-cyan-400">{mergingSourceId}</code> into another node. All inbound and outbound dependencies and checklists will be transferred.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Target Node (Recipient)</label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono"
                >
                  {graph.nodes
                    .filter((n) => n.id !== mergingSourceId)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.id} - {n.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMergingSourceId(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMerge}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
                >
                  Confirm Merge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
