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

// refine-map-editor 3.3: the new plant meshes keep the budget at strategic zoom,
// over the Fazenda's crops and on the largest authored map.
for (const map of ['fazenda', 'fazenda-doc']) {
  test(`strategic zoom over the crops of ${map} stays within the frame budget`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');
    const gpu = await renderer(page);
    test.skip(/swiftshader|llvmpipe|software|none/i.test(gpu), `no GPU for the probe (${gpu})`);
    if (map === 'fazenda') {
      await page.getByTestId('open-skirmish').click();
      await page.getByTestId(`map-option-${map}`).click();
      await page.getByTestId('start-battle-3v3').click();
    } else {
      // A campaign map: opened in the editor and played from there.
      await page.goto('/editor.html');
      await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
      await page.getByTestId('editor-import-input').setInputFiles(`packages/shared/src/maps/authored/${map}.map.json`);
      await expect.poll(() => page.evaluate(() => (window as unknown as { __prestesEditor: { state: () => { id: string } } }).__prestesEditor.state().id)).toBe(map);
      await page.getByTestId('editor-playtest').click();
      await page.waitForURL(/index\.html\?playtest=1/);
    }
    await expect(page.getByTestId('hud')).toBeVisible();
    await page.evaluate(() => {
      const scene = (window as unknown as Bridge).__prestesScene!;
      scene.setBand('strategic');
      // Between the cornfield and the canefield.
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
