import { expect, test, type Page } from '@playwright/test';

// add-map-compass: the author sets north in the editor; the battle compass
// points the way north runs on screen as the view turns.

interface Point {
  x: number;
  y: number;
}
interface Camera {
  yaw: number;
  tilt: number;
  targetYaw?: number;
}
interface Bridge {
  __prestesEditor?: {
    state: () => { id: string; north: number | null };
    toScreen: (x: number, y: number) => Point | null;
    sun: () => [number, number, number] | null;
    document: () => { north?: number; version: number };
    topDown: () => void;
    viewport: () => { view: { camera: Camera } } | null;
  };
  __prestesScene?: { camera: () => Camera };
  __prestes?: { frame: () => { units: unknown[] } | null };
}

/** The expected angle (degrees clockwise from screen up), as `compassAngle` in packages/view3d computes it. */
function expected(north: number, camera: Camera): number {
  const heading = (north * Math.PI) / 180 + camera.yaw;
  const degrees = (Math.atan2(Math.sin(heading), Math.cos(heading) * Math.sin(camera.tilt)) * 180) / Math.PI;
  return ((degrees % 360) + 360) % 360;
}

const gap = (a: number, b: number): number => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

const shownAngle = async (page: Page, testId: string): Promise<number> => Number(await page.getByTestId(testId).getAttribute('data-angle'));

const editorState = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state());
const editorCamera = (page: Page) => page.evaluate(() => {
  const camera = (window as unknown as Bridge).__prestesEditor!.viewport()!.view.camera;
  return { yaw: camera.yaw, tilt: camera.tilt };
});
const battleCamera = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestesScene!.camera());

/** Waits until a camera has stopped turning. */
async function stillCamera(read: () => Promise<Camera>): Promise<Camera> {
  let last = '';
  await expect
    .poll(async () => {
      const camera = await read();
      const now = `${camera.yaw.toFixed(4)} ${camera.tilt.toFixed(4)}`;
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [250] })
    .toBe(true);
  return read();
}

async function expectCompass(page: Page, testId: string, north: number, camera: Camera): Promise<number> {
  const want = expected(north, camera);
  await expect.poll(async () => gap(await shownAngle(page, testId), want)).toBeLessThan(0.5);
  return want;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true }));
  });
});

test('north set in the editor is saved, read back and shown by the battle compass as the view turns', async ({ page }, testInfo) => {
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());

  // A new map: the top edge is north and the document leaves the field out.
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('teste-norte');
  await page.getByTestId('map-size').selectOption('small');
  await page.getByTestId('map-name-en').fill('North field');
  await page.getByTestId('map-name-pt').fill('Campo do norte');
  await page.getByTestId('map-submit').click();
  await expect.poll(async () => (await editorState(page)).id).toBe('teste-norte');
  expect((await editorState(page)).north).toBeNull();
  let camera = await stillCamera(() => editorCamera(page));
  await expectCompass(page, 'editor-compass', 0, camera);

  // The slider previews the arrow and the sun before the dialog is applied.
  const sunBefore = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.sun());
  await page.getByTestId('editor-properties').click();
  await page.getByTestId('map-north-bearing').fill('90');
  await expect(page.getByTestId('map-north')).toContainText('90°');
  await expect(page.getByTestId('map-north')).toContainText('west');
  await expectCompass(page, 'editor-compass', 90, camera);
  expect(await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.sun())).not.toEqual(sunBefore);
  await page.getByTestId('map-submit').click();
  expect((await editorState(page)).north).toBe(90);
  expect(await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.document())).toMatchObject({ north: 90, version: 10 });
  await page.screenshot({ path: testInfo.outputPath('editor-north-90.png') });

  // Undo restores the top edge; redo brings 90 back.
  await page.getByTestId('editor-undo').click();
  expect((await editorState(page)).north).toBeNull();
  await expectCompass(page, 'editor-compass', 0, camera);
  await page.keyboard.press('Control+Shift+KeyZ');
  expect((await editorState(page)).north).toBe(90);

  // Read back: the autosave reopens the map with its north, and the dialog shows it.
  await expect(page.locator('[data-state="autosaved"]')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await expect.poll(async () => (await editorState(page)).id).toBe('teste-norte');
  expect((await editorState(page)).north).toBe(90);
  await page.getByTestId('editor-properties').click();
  await expect(page.getByTestId('map-north-bearing')).toHaveValue('90');
  await page.getByRole('button', { name: 'Close' }).click();

  // The editor's arrow turns with its camera (E).
  await page.getByTestId('editor-viewport').hover();
  await page.keyboard.press('KeyE');
  camera = await stillCamera(() => editorCamera(page));
  await expectCompass(page, 'editor-compass', 90, camera);

  // Playtest: the battle compass reads the map's north at several rotations.
  await page.getByTestId('editor-playtest').click();
  await page.waitForURL(/index\.html\?playtest=1/);
  await expect(page.getByTestId('hud')).toBeVisible();
  const compass = page.getByTestId('battle-compass');
  await expect(compass).toBeVisible();
  await expect(compass).toHaveAttribute('aria-label', 'Compass: click to turn north up');
  await page.locator('canvas').first().hover();
  const seen: number[] = [];
  for (const key of ['', 'KeyE', 'KeyE', 'KeyQ', 'KeyQ', 'KeyQ']) {
    if (key) await page.keyboard.press(key);
    camera = await stillCamera(() => battleCamera(page));
    seen.push(await expectCompass(page, 'battle-compass', 90, camera));
  }
  // The rotations gave different headings, not one angle checked six times.
  expect(new Set(seen.map((angle) => Math.round(angle))).size).toBeGreaterThanOrEqual(4);
  await page.screenshot({ path: testInfo.outputPath('battle-compass-turned.png') });

  // Clicking the compass turns the view until north is up.
  await compass.click();
  camera = await stillCamera(() => battleCamera(page));
  expect(gap(await shownAngle(page, 'battle-compass'), 0)).toBeLessThan(0.5);
  expect(gap((camera.yaw * 180) / Math.PI, -90)).toBeLessThan(0.5);
  await compass.screenshot({ path: testInfo.outputPath('battle-compass-north-up.png') });
  await page.screenshot({ path: testInfo.outputPath('battle-north-up.png') });
});

test('a map without north: the compass follows the camera from the top edge', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.locator('canvas').first().hover();
  let camera = await stillCamera(() => battleCamera(page));
  const first = await expectCompass(page, 'battle-compass', 0, camera);
  // The default view is turned 45 degrees: north runs up and to the right.
  expect(first).toBeGreaterThan(30);
  expect(first).toBeLessThan(90);
  await page.keyboard.press('KeyE');
  camera = await stillCamera(() => battleCamera(page));
  await expectCompass(page, 'battle-compass', 0, camera);
});
