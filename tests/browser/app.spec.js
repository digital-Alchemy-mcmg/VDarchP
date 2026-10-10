import { test, expect } from '@playwright/test';

// Serve localhost responses through Playwright's Node request client. The
// workspace Chromium build blocks direct loopback navigation.
test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:4173/**', async route => {
    const response = await page.request.fetch(route.request());
    await route.fulfill({ response });
  });
});

test('C08: actual App rerenders after repeated phase and nested graph mutations', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SPA DAG Canvas Dashboard', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const { modelStore } = await import('/src/store/ModelStore.ts');
    const { parseMermaidToDAG } = await import('/src/services/parser.ts');
    modelStore.setProposal(parseMermaidToDAG('graph TD\n A[Alpha]\n B[Beta]\n A --> B'));
  });
  await expect(page.getByRole('heading', { name: 'Review Proposed Architecture DAG' })).toBeVisible();
  await page.evaluate(async () => (await import('/src/store/ModelStore.ts')).modelStore.acceptProposal());
  await expect(page.getByText('Rename, merge, wire, or delete components before locking topology.')).toBeVisible();
  await page.evaluate(async () => (await import('/src/store/ModelStore.ts')).modelStore.lockTopologyForever());
  await expect(page.getByText('TOPOLOGY FROZEN', { exact: true })).toBeVisible();
  const canvas = page.getByRole('region', { name: 'DAG Canvas Viewport' });
  await expect(canvas.getByText('Alpha', { exact: true })).toBeVisible();
  for (const status of ['VERIFIED', 'BLOCKED']) {
    await page.evaluate(async status => {
      const { modelStore } = await import('/src/store/ModelStore.ts');
      modelStore.updateNodeStatus('COMP-A', status);
    }, status);
    await expect(canvas.getByText(status, { exact: true })).toBeVisible();
  }
  await page.evaluate(async () => (await import('/src/store/ModelStore.ts')).modelStore.resetToEmpty());
  await expect(page.getByRole('heading', { name: 'SPA DAG Canvas Dashboard', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('R01: settings starts closed and can repeatedly open and close', async ({ page }) => {
  await page.goto('/');
  const heading = page.getByRole('heading', { name: 'Dashboard Settings', exact: true });
  await expect(heading).not.toBeVisible();
  for (let i = 0; i < 2; i++) {
    await page.getByTitle('Settings & Gemini API Key').click();
    await expect(heading).toBeVisible();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await expect(heading).not.toBeVisible();
  }
});

test('R03: cyclic import lock failure is visible and does not throw a page error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(async () => {
    const { modelStore } = await import('/src/store/ModelStore.ts');
    const { parseMermaidToDAG } = await import('/src/services/parser.ts');
    modelStore.setProposal(parseMermaidToDAG('graph TD\n A --> B\n B --> A'));
    modelStore.acceptProposal();
  });
  await page.locator('header').getByRole('button', { name: 'Lock Topology', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Freeze & Lock Topology Forever' }).click();
  await expect(page.getByRole('alert')).toContainText('Cycle detected');
  await expect(page.getByText('MUTABLE TOPOLOGY', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel (Keep Mutable)' }).click();
  expect(errors).toEqual([]);
});
