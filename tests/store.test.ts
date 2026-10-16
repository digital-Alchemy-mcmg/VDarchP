import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
} });
const { modelStore: store } = await import('../src/store/ModelStore');
const { parseMermaidToDAG } = await import('../src/services/parser');

// Each action must publish a new, stable snapshot without changing earlier snapshots.
function published(action: () => void) {
  const before = store.getState();
  const saved = structuredClone(before);
  let count = 0;
  const stop = store.subscribe(next => {
    count++;
    assert.notEqual(next, before);
    assert.equal(next, store.getState());
  });
  try {
    action();
    assert.equal(count, 1, 'one notification per meaningful action');
    assert.deepEqual(before, saved, 'previous React snapshot must remain unchanged');
  } finally { stop(); }
}

test('C08: repeated UI, topology, annotation, history and transaction actions publish snapshots', () => {
  published(() => store.setPhase('P1_INGEST'));
  published(() => store.setPhase('P0_EMPTY'));
  published(() => store.setProposal(parseMermaidToDAG('graph TD\n A[Alpha]\n B[Beta]\n A --> B')));
  published(() => store.acceptProposal());
  const [a, b] = store.getState().graph.nodes.map(n => n.id);
  published(() => store.setSelectedNode(a));
  published(() => store.setHoveredNode(b));
  published(() => store.setInspectorMode('envelope'));
  published(() => store.setSearchQuery('Alpha'));
  published(() => store.setFilterStatus('DRAFT'));
  published(() => store.setViewTransform({ x: 20, y: 30, zoom: 1.5 }));
  published(() => store.updateEnvelope({ maxLatencySlaMs: 25 }));
  published(() => store.updateSettings({ showGrid: false }));
  published(() => store.updateNodePosition(a, { x: 42, y: 84 }));
  published(() => store.recomputeLayout());
  published(() => store.updateNodeIdentity(a, { name: 'Renamed' }));
  published(() => store.updateNodeStatus(a, 'VERIFIED'));
  published(() => store.addArtifactLink(a, { title: 'Spec', url: 'https://example.com', type: 'doc' }));
  published(() => store.removeArtifactLink(a, store.getState().graph.nodes.find(n => n.id === a)!.artifacts.at(-1)!.id));
  published(() => store.addRequiredItem(a, 'Test', 'testing'));
  const itemId = store.getState().graph.nodes.find(n => n.id === a)!.requiredItems.at(-1)!.id;
  published(() => store.toggleRequiredItem(a, itemId));
  published(() => store.removeRequiredItem(a, itemId));
  published(() => store.uploadJunctionSchema(a, { name: 'schema.json', content: '{}' }));
  published(() => store.removeJunctionSchema(a));
  published(() => store.updateProvenance(a, { protocol: 'gRPC' }));
  published(() => store.undo());
  published(() => store.redo());
  store.beginTransaction();
  published(() => store.updateNodeStatus(a, 'BLOCKED'));
  published(() => store.rollback());
  store.beginTransaction();
  published(() => store.commit());
  published(() => store.removeEdge(store.getState().graph.edges[0].id));
  published(() => store.addEdge({ source: a, target: b }));
  published(() => store.addNode({ ...store.getState().graph.nodes[0], id: 'COMP-C', artifacts: [], requiredItems: [] }));
  published(() => store.mergeNodes('COMP-C', b));
  published(() => store.removeNode(b));
  published(() => store.lockTopologyForever());
  published(() => { assert.throws(() => store.removeNode(a), /Freeze Invariant/); });
  published(() => store.clearError());
  published(() => store.resetToEmpty());
  let notified = false;
  const stop = store.subscribe(() => { notified = true; });
  stop();
  store.setSearchQuery('after unsubscribe');
  assert.equal(notified, false);
});

test('R02: locking is a history and transaction boundary; annotation undo remains usable', () => {
  store.resetToEmpty();
  store.setProposal(parseMermaidToDAG('graph TD\n A[Alpha]\n B[Beta]\n A --> B'));
  store.acceptProposal();
  store.beginTransaction();
  store.lockTopologyForever();
  const locked = structuredClone(store.getState().graph);
  store.undo();
  assert.deepEqual(store.getState().graph, locked, 'undo must not restore pre-lock topology');
  store.rollback();
  assert.deepEqual(store.getState().graph, locked, 'rollback must not restore pre-lock topology');
  assert.throws(() => store.setPhase('P2_CONFIRM_EDIT'), /Freeze Invariant/);
  assert.throws(() => store.setProposal(parseMermaidToDAG('graph TD\n C[Replacement]')), /Freeze Invariant/);
  store.updateNodeStatus('COMP-A', 'VERIFIED');
  store.undo();
  assert.equal(store.getState().graph.nodes.find(n => n.id === 'COMP-A')!.status, 'DRAFT');
  assert.equal(store.getState().graph.isLocked, true);
  store.redo();
  assert.equal(store.getState().graph.nodes.find(n => n.id === 'COMP-A')!.status, 'VERIFIED');
  assert.equal(store.getState().graph.isLocked, true);
  assert.throws(() => store.removeNode('COMP-A'), /Freeze Invariant/);
  store.resetToEmpty();
  assert.equal(store.getState().phase, 'P0_EMPTY');
  assert.equal(store.getState().graph.isLocked, false);
});

test('R03: reverse dependencies, dangling endpoints and cyclic merges reject atomically; lock checks imports', () => {
  store.resetToEmpty();
  store.setProposal(parseMermaidToDAG('graph TD\n A[Alpha]\n B[Beta]\n C[Gamma]\n A --> B\n B --> C'));
  store.acceptProposal();
  const before = structuredClone(store.getState().graph);
  const historyLength = store.getState().history.length;
  assert.throws(() => store.addEdge({ source: 'COMP-C', target: 'COMP-A' }), /cycle/i);
  assert.deepEqual(store.getState().graph, before);
  assert.equal(store.getState().history.length, historyLength);
  assert.throws(() => store.addEdge({ source: 'MISSING', target: 'COMP-A' }), /exist/i);
  assert.throws(() => store.mergeNodes('COMP-A', 'COMP-C'), /cycle/i);
  assert.deepEqual(store.getState().graph, before);
  store.addEdge({ source: 'COMP-A', target: 'COMP-C' });
  assert.equal(store.getState().graph.edges.length, 3);
  store.resetToEmpty();
  store.setProposal(parseMermaidToDAG('graph TD\n A --> B\n B --> A'));
  store.acceptProposal();
  assert.throws(() => store.lockTopologyForever(), /cycle/i);
  assert.equal(store.getState().graph.isLocked, false);
  assert.equal(store.getState().phase, 'P2_CONFIRM_EDIT');
  store.removeEdge(store.getState().graph.edges[1].id);
  store.lockTopologyForever();
  assert.equal(store.getState().graph.isLocked, true);
  store.resetToEmpty();
});

test('R06: layout orientation recomputes node positions and notifies once', () => {
  store.resetToEmpty();
  store.updateSettings({ layoutDirection: 'TB' });
  store.setProposal(parseMermaidToDAG('graph TD\n A --> B'));
  store.acceptProposal();
  const node = (id: string) => store.getState().graph.nodes.find(n => n.id === id)!;
  assert.equal(node('COMP-A').position.x, node('COMP-B').position.x);
  assert.notEqual(node('COMP-A').position.y, node('COMP-B').position.y);
  published(() => store.updateSettings({ layoutDirection: 'LR' }));
  assert.equal(node('COMP-A').position.y, node('COMP-B').position.y);
  assert.notEqual(node('COMP-A').position.x, node('COMP-B').position.x);
  store.lockTopologyForever();
  published(() => store.updateSettings({ layoutDirection: 'TB' }));
  assert.equal(node('COMP-A').position.x, node('COMP-B').position.x);
  assert.notEqual(node('COMP-A').position.y, node('COMP-B').position.y);
  assert.equal(store.getState().graph.isLocked, true);
  store.resetToEmpty();
});
