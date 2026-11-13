import { expect, test, type Page } from '@playwright/test';

/**
 * Frame-time probe (low-poly-art-pass): the full section at tactical span,
 * drawn with the Blender models, stays under a fixed per-frame budget.
 *
 * The probe runs Chromium on the GPU with vsync and the frame-rate cap off,
 * so the requestAnimationFrame interval is the real cost of a frame rather
 * than the display's refresh. Without a GPU the browser falls back to
 * SwiftShader (about 95 ms a frame for any scene), so the probe is skipped.
 */

interface Unit {
  id: number;
  x: number;
  y: number;
  faction: string;
  kind: string;
  alive: boolean;
}

interface Bridge {
  __prestes?: { frame: () => { units: Unit[] } | null };
  __prestesScene?: {
    focusOn: (x: number, y: number) => void;
    setBand: (band: 'tactical' | 'strategic') => void;
    clips: (unitId: number) => unknown;
  };
}

/** Mean frame time budget (ms): one 60 Hz frame. */
const BUDGET_MS = Number(process.env.PRESTES_FRAME_BUDGET_MS ?? 16.7);
const SAMPLE_MS = 4000;

test.use({
  launchOptions: {
    args: [
      '--use-angle=d3d11',
      '--enable-gpu',
      '--ignore-gpu-blocklist',
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
    ],
  },
});

async function renderer(page: Page): Promise<string> {
  return page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return 'none';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  });
}

async function openSection(page: Page): Promise<number[]> {
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units.length ?? 0))
    .toBeGreaterThanOrEqual(11);
  const ids = await page.evaluate(() => {
    const units = (window as unknown as Bridge).__prestes?.frame()?.units ?? [];
    const section = units.filter((unit) => unit.faction === 'column' && unit.kind !== 'dummy' && unit.alive);
    const x = section.reduce((sum, unit) => sum + unit.x, 0) / Math.max(1, section.length);
    const y = section.reduce((sum, unit) => sum + unit.y, 0) / Math.max(1, section.length);
    const scene = (window as unknown as Bridge).__prestesScene!;
    scene.setBand('tactical');
    scene.focusOn(x, y);
    return section.map((unit) => unit.id);
  });
  expect(ids.length).toBeGreaterThanOrEqual(11);
  return ids;
}

/** Mean and 95th percentile of the requestAnimationFrame intervals (ms). */
async function sampleFrames(page: Page): Promise<{ mean: number; p95: number; frames: number }> {
  return page.evaluate(async (duration) => {
    const intervals: number[] = [];
    await new Promise<void>((resolve) => {
      let last = performance.now();
      const start = last;
      const tick = (now: number): void => {
        intervals.push(now - last);
        last = now;
        if (now - start < duration) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    intervals.shift();
    const sorted = [...intervals].sort((a, b) => a - b);
    const mean = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    return { mean, p95: sorted[Math.floor(sorted.length * 0.95)] ?? mean, frames: intervals.length };
  }, SAMPLE_MS);
}

test('the section at tactical span stays within the frame budget', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  const gpu = await renderer(page);
  test.skip(/swiftshader|llvmpipe|software|none/i.test(gpu), `no GPU for the probe (${gpu})`);

  const ids = await openSection(page);
  // The skinned soldiers are drawn once the model has loaded and the band is tactical.
  await expect
    .poll(() => page.evaluate((id) => (window as unknown as Bridge).__prestesScene!.clips(id) !== null, ids[0]!), {
      timeout: 20_000,
    })
    .toBe(true);
  await page.waitForTimeout(1000);
  const result = await sampleFrames(page);
  test.info().annotations.push({
    type: 'frame-time',
    description: `${gpu}: mean ${result.mean.toFixed(2)} ms, p95 ${result.p95.toFixed(2)} ms, ${result.frames} frames`,
  });
  expect(result.mean).toBeLessThan(BUDGET_MS);
});

// refine-map-editor 3.3: the budget at strategic zoom; author-game-maps 3.5 on the
// test map (the Fazenda's crops leave with the generated maps).
for (const map of ['campo-de-provas']) {
  test(`strategic zoom over ${map} stays within the frame budget`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    const gpu = await renderer(page);
    test.skip(/swiftshader|llvmpipe|software|none/i.test(gpu), `no GPU for the probe (${gpu})`);
    await page.getByTestId('open-skirmish').click();
    await page.getByTestId(`map-option-${map}`).click();
    await page.getByTestId('start-battle-3v3').click();
    await expect(page.getByTestId('hud')).toBeVisible();
    await page.evaluate(() => {
      const scene = (window as unknown as Bridge).__prestesScene!;
      scene.setBand('strategic');
      scene.focusOn(0, -6);
    });
    await page.waitForTimeout(2500);
    const result = await sampleFrames(page);
    test.info().annotations.push({
      type: 'frame-time',
      description: `${map} strategic, ${gpu}: mean ${result.mean.toFixed(2)} ms, p95 ${result.p95.toFixed(2)} ms, ${result.frames} frames`,
    });
    expect(result.mean).toBeLessThan(BUDGET_MS);
  });
}

// biome-trees-and-plants 4.1: a dense wood of the biome trees, scattered in the editor,
// at tactical span (the models) and strategic span (their stand-ins).
interface EditorBridge {
  __prestesEditor?: {
    state: () => { objects: { type: string }[] };
    toScreen: (x: number, y: number) => { x: number; y: number } | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
  };
}

test('a dense wood of biome trees stays within the frame budget at tactical and strategic span', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/editor.html');
  const gpu = await renderer(page);
  test.skip(/swiftshader|llvmpipe|software|none/i.test(gpu), `no GPU for the probe (${gpu})`);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  const editor = (fn: string, ...args: number[]) =>
    page.evaluate(([name, values]) => {
      const bridge = (window as unknown as EditorBridge).__prestesEditor! as unknown as Record<string, (...a: number[]) => unknown>;
      return bridge[name as string]!(...(values as number[]));
    }, [fn, args] as const);
  await editor('topDown');
  await page.waitForTimeout(1500);
  await page.locator('[data-tool="trees"]').click();
  await page.getByTestId('tree-mode-scatter').click();
  await page.getByTestId('tree-density').selectOption('dense');
  for (const id of ['acai', 'andiroba', 'castanheira', 'seringueira', 'sumauma', 'tucuma', 'bush-amazonia-head-a']) await page.locator(`[data-tree="${id}"]`).click();
  for (let press = 0; press < 16; press += 1) await page.keyboard.press(']');
  for (const y of [-60, -36, -12, 12, 36, 60]) {
    const a = (await editor('toScreen', -60, y)) as { x: number; y: number };
    const b = (await editor('toScreen', 60, y)) as { x: number; y: number };
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 12 });
    await page.mouse.up();
  }
  const trees = await page.evaluate(() => (window as unknown as EditorBridge).__prestesEditor!.state().objects.length);
  expect(trees).toBeGreaterThan(400);
  for (const [band, span] of [['tactical', 60], ['strategic', 220]] as const) {
    await editor('look', 0, 0, span);
    await page.waitForTimeout(2500);
    const result = await sampleFrames(page);
    test.info().annotations.push({
      type: 'frame-time',
      description: `wood of ${trees} trees, ${band}, ${gpu}: mean ${result.mean.toFixed(2)} ms, p95 ${result.p95.toFixed(2)} ms, ${result.frames} frames`,
    });
    expect(result.mean).toBeLessThan(BUDGET_MS);
  }
});

// biome-trees-and-plants 5.2 (spec "Trees stay inside the frame budget"): a large
// map with a third of its ground under the Atlantic forest mix, both camera bands.
test('a large map a third under the Atlantic forest mix stays within the frame budget', async ({ page }) => {
  test.setTimeout(420_000);
  await page.goto('/editor.html');
  const gpu = await renderer(page);
  test.skip(/swiftshader|llvmpipe|software|none/i.test(gpu), `no GPU for the probe (${gpu})`);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  const editor = (fn: string, ...args: number[]) =>
    page.evaluate(([name, values]) => {
      const bridge = (window as unknown as EditorBridge).__prestesEditor! as unknown as Record<string, (...a: number[]) => unknown>;
      return bridge[name as string]!(...(values as number[]));
    }, [fn, args] as const);
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('mata-grande');
  await page.getByTestId('map-size').selectOption('large');
  await page.getByTestId('map-name-en').fill('Large wood');
  await page.getByTestId('map-name-pt').fill('Mata grande');
  await page.getByTestId('map-submit').click();
  await page.waitForTimeout(1000);
  await editor('topDown');
  // The whole map in view (the editor's camera is turned 45 degrees).
  await editor('look', 0, -100, 1000);
  // The camera eases to its frame: wait until a ground point stops moving.
  let last = '';
  await expect
    .poll(async () => {
      const now = JSON.stringify(await editor('toScreen', 0, 0));
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [500] })
    .toBe(true);
  await page.locator('[data-tool="trees"]').click();
  await page.getByTestId('tree-mode-scatter').click();
  await page.getByTestId('tree-biome').selectOption('atlantic-edge');
  await page.getByTestId('tree-density').selectOption('dense');
  // The brush keys go to the viewport, not the density list.
  await page.getByTestId('tree-mix-hint').click();
  for (let press = 0; press < 40; press += 1) await page.keyboard.press(']');
  // Rows 54 m apart under a 64 m brush: the northern third, 640 x 226 m.
  for (const y of [-300, -246, -192, -138]) {
    const a = (await editor('toScreen', -300, y)) as { x: number; y: number };
    const b = (await editor('toScreen', 300, y)) as { x: number; y: number };
    const box = await page.getByTestId('editor-viewport').boundingBox();
    for (const point of [a, b]) {
      expect(point.x).toBeGreaterThan(box!.x);
      expect(point.x).toBeLessThan(box!.x + box!.width);
      expect(point.y).toBeGreaterThan(box!.y);
      expect(point.y).toBeLessThan(box!.y + box!.height);
    }
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 40 });
    await page.mouse.up();
  }
  const trees = await page.evaluate(() => (window as unknown as EditorBridge).__prestesEditor!.state().objects.length);
  expect(trees).toBeGreaterThan(5000);
  for (const [band, x, y, span] of [['tactical', 0, -220, 60], ['strategic', 0, -100, 400]] as const) {
    await editor('look', x, y, span);
    await page.waitForTimeout(3000);
    const result = await sampleFrames(page);
    test.info().annotations.push({
      type: 'frame-time',
      description: `large map, ${trees} trees, ${band}, ${gpu}: mean ${result.mean.toFixed(2)} ms, p95 ${result.p95.toFixed(2)} ms, ${result.frames} frames`,
    });
    expect(result.mean).toBeLessThan(BUDGET_MS);
  }
});

// revise-buildings-and-stone 6.1 (spec "Structures stay inside the frame
// budget"): a large map with a town of sixty buildings of mixed types, both
// camera bands; at strategic span each building is its mesh without small
// features (D8), and the town's file is loaded because the map has a town.
const TOWN = [
  'casa-terrea', 'sobrado', 'venda', 'armazem', 'church', 'school', 'town-hall', 'jail', 'terraced-house', 'terraced-house-wide',
  'market-shed', 'coreto', 'telegraph-office', 'railway-station', 'warehouse', 'factory', 'depot', 'water-tank',
  'farmhouse', 'barn', 'chapel', 'casa-sede', 'engenho', 'rancho', 'barracks-block', 'guardhouse',
];

test('a large map with a town of sixty buildings stays within the frame budget', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/editor.html');
  const gpu = await renderer(page);
  test.skip(/swiftshader|llvmpipe|software|none/i.test(gpu), `no GPU for the probe (${gpu})`);
  await page.addInitScript(() => localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  const editor = (fn: string, ...args: number[]) =>
    page.evaluate(([name, values]) => {
      const bridge = (window as unknown as EditorBridge).__prestesEditor! as unknown as Record<string, (...a: number[]) => unknown>;
      return bridge[name as string]!(...(values as number[]));
    }, [fn, args] as const);
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('vila-grande');
  await page.getByTestId('map-size').selectOption('large');
  await page.getByTestId('map-name-en').fill('Large town');
  await page.getByTestId('map-name-pt').fill('Vila grande');
  await page.getByTestId('map-submit').click();
  await page.waitForTimeout(1000);
  await editor('topDown');
  await editor('look', 0, 0, 340);
  let last = '';
  await expect
    .poll(async () => {
      const now = JSON.stringify(await editor('toScreen', 0, 0));
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [500] })
    .toBe(true);
  await page.locator('[data-tool="place"]').click();
  const buildings = page.locator('.editor-catalog details[data-group="building"]');
  if (!(await buildings.evaluate((element) => (element as HTMLDetailsElement).open))) await buildings.locator('summary').click();
  // Ten blocks across, six down, 28 m apart.
  for (let index = 0; index < 60; index += 1) {
    await buildings.locator(`[data-object="${TOWN[index % TOWN.length]}"]`).click();
    const at = (await editor('toScreen', -126 + (index % 10) * 28, -70 + Math.floor(index / 10) * 28)) as { x: number; y: number };
    await page.mouse.click(at.x, at.y);
  }
  const placed = await page.evaluate(() => (window as unknown as EditorBridge).__prestesEditor!.state().objects.length);
  expect(placed).toBe(60);
  for (const [band, span] of [['tactical', 60], ['strategic', 400]] as const) {
    await editor('look', 0, 0, span);
    await page.waitForTimeout(3000);
    const result = await sampleFrames(page);
    test.info().annotations.push({
      type: 'frame-time',
      description: `town of ${placed} buildings, ${band}, ${gpu}: mean ${result.mean.toFixed(2)} ms, p95 ${result.p95.toFixed(2)} ms, ${result.frames} frames`,
    });
    expect(result.mean).toBeLessThan(BUDGET_MS);
  }
});
