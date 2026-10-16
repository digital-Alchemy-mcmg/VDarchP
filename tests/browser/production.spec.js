import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test('production artifact: assets, deep-link reload, ingestion, lock, annotation, persistence and export', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://127.0.0.1:4173/**', async route => {
    const response = await page.request.fetch(route.request());
    await route.fulfill({ response });
  });
  await page.goto('/review/direct-link');
  await expect(page.getByRole('heading', { name: 'SPA DAG Canvas Dashboard', exact: true })).toBeVisible();
  const assets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll(elements =>
    elements.map(element => element.getAttribute('src') || element.getAttribute('href')).filter(url => url.startsWith('/assets/')));
  expect(assets.length).toBeGreaterThanOrEqual(2);
  for (const asset of assets) {
    const response = await page.request.get(asset);
    expect(response.status()).toBe(200);
    expect((await response.body()).length).toBeGreaterThan(100);
    expect(response.headers()['content-type']).not.toContain('text/html');
  }
  await expect(page.getByRole('heading', { name: 'Dashboard Settings' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page.locator('header').getByRole('button', { name: /E-Commerce Microservices/ }).click();
  await expect(page.getByRole('heading', { name: 'Review Proposed Architecture DAG' })).toBeVisible();
  await page.getByRole('button', { name: 'Accept & Proceed to P2 Grid' }).click();
  await expect(page.locator('header').getByText('11 nodes', { exact: true })).toBeVisible();
  await expect(page.locator('header').getByText('12 edges', { exact: true })).toBeVisible();
  await page.locator('header').getByRole('button', { name: 'Lock Topology', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Freeze & Lock Topology Forever' }).click();
  await expect(page.getByText('TOPOLOGY FROZEN', { exact: true })).toBeVisible();
  await expect(page.getByTitle('Undo', { exact: true })).toBeDisabled();
  const canvas = page.getByRole('region', { name: 'DAG Canvas Viewport' });
  await canvas.getByText('Auth & Identity Service', { exact: true }).click();
  const inspector = page.getByRole('complementary', { name: 'Architecture Inspector' });
  await inspector.locator('select').first().selectOption('VERIFIED');
  await expect(canvas.getByText('VERIFIED', { exact: true })).toBeVisible();
  await page.getByTitle('Undo', { exact: true }).click();
  await expect(canvas.getByText('VERIFIED', { exact: true })).not.toBeVisible();
  await expect(page.getByText('TOPOLOGY FROZEN', { exact: true })).toBeVisible();
  await page.getByTitle('Redo', { exact: true }).click();
  await expect(canvas.getByText('VERIFIED', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('TOPOLOGY FROZEN', { exact: true })).toBeVisible();
  await expect(canvas.getByText('VERIFIED', { exact: true })).toBeVisible();
  await page.getByTitle('Export Manifest Markdown Specification').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .md', exact: true }).click();
  const download = await downloadPromise;
  const filename = testInfo.outputPath('architecture-manifest.md');
  await download.saveAs(filename);
  const markdown = await readFile(filename, 'utf8');
  expect(markdown).toContain('FROZEN_LOCKED');
  expect(markdown).toContain('VALID_DAG');
  expect(markdown).toContain('VERIFIED');
  expect(markdown).toContain('```mermaid');
  const graph = await page.evaluate(() => JSON.parse(localStorage.getItem('spa_dag_canvas_dashboard_v1')).graph);
  const canonical = JSON.stringify({
    title: graph.title, version: graph.version, isLocked: graph.isLocked,
    nodeIds: graph.nodes.map(n => n.id).sort(),
    edgePairs: graph.edges.map(e => `${e.source}->${e.target}`).sort(),
  });
  const digest = createHash('sha256').update(canonical).digest('hex');
  expect(markdown).toContain(`checksum: "sha256:${digest}"`);
  expect(errors).toEqual([]);
});
