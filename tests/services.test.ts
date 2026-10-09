import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { parseMermaidToDAG } from '../src/services/parser';
import { computeManifestChecksum, generateManifestMarkdown } from '../src/services/manifestExport';

test('R04: checksum is a real SHA-256 of the established canonical topology payload', () => {
  const graph = parseMermaidToDAG('graph TD\n A --> B').graph;
  const canonical = JSON.stringify({
    title: graph.title, version: graph.version, isLocked: graph.isLocked,
    nodeIds: graph.nodes.map(n => n.id).sort(),
    edgePairs: graph.edges.map(e => `${e.source}->${e.target}`).sort(),
  });
  const expected = 'sha256:' + createHash('sha256').update(canonical).digest('hex');
  assert.equal(computeManifestChecksum(graph), expected);
  assert.equal(computeManifestChecksum({ ...graph, nodes: [...graph.nodes].reverse() }), expected);
  assert.notEqual(computeManifestChecksum({ ...graph, edges: [] }), expected);
  assert.match(generateManifestMarkdown(graph), new RegExp(`checksum: "${expected}"`));
});

test('R05: Markdown arrows preserve source IDs and word "to" does not split names', async () => {
  const { parseTextToDAG } = await import('../src/services/parser');
  for (const arrow of ['-->', '->', '=>', 'to']) {
    const graph = parseTextToDAG(`NodeA ${arrow} NodeB`).graph;
    assert.deepEqual(graph.nodes.map(n => n.id).sort(), ['COMP-NODEA', 'COMP-NODEB']);
    assert.deepEqual(graph.edges.map(e => [e.source, e.target]), [['COMP-NODEA', 'COMP-NODEB']]);
  }
  const graph = parseTextToDAG('- API-worker --> Storage [state]').graph;
  assert.equal(graph.nodes[0].name, 'API-worker');
  assert.equal(graph.nodes[1].name, 'Storage');
  assert.equal(graph.edges[0].label, 'state');
  assert.equal(parseTextToDAG('Storage').graph.nodes.length, 0);
});

test('R07: starter Mermaid diagrams retain every edge and inline node definition', async () => {
  const { SAMPLE_STARTER_DAGS } = await import('../src/services/parser');
  for (const [key, source] of Object.entries(SAMPLE_STARTER_DAGS)) {
    const graph = parseMermaidToDAG(source).graph;
    const expectedEdges = source.split('\n').filter(line => line.includes('-->')).length;
    assert.equal(graph.edges.length, expectedEdges, `${key} must retain all documented connections`);
    assert.ok(graph.nodes.every(node => !node.id.includes('---')), 'arrows cannot become node IDs');
    assert.equal(graph.nodes.length, { ecommerce: 11, etlDataLake: 10, zeroTrustAuth: 9 }[key]);
  }
  const graph = parseMermaidToDAG('graph TD\n A[Alpha] -->|HTTPS| B(Beta) --> C[(Database)]').graph;
  assert.equal(graph.edges.length, 2);
  assert.equal(graph.nodes.find(node => node.name === 'Beta')!.type, 'service');
  assert.equal(graph.nodes.find(node => node.name === 'Database')!.type, 'datastore');
  assert.equal(graph.edges[0].label, 'HTTPS');
});
