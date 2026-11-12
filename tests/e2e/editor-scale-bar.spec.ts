import { writeFileSync } from 'node:fs';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

// The editor's scale bar (CAD style) on the view and on the saved thumbnail,
// and the desk's map sheet showing only the editor's print.

interface Point {
  x: number;
  y: number;
}
interface Bridge {
  __prestesEditor?: {
    toScreen: (x: number, y: number) => Point | null;
    topDown: () => void;
    look: (x: number, y: number, span: number) => void;
    scaleBar: () => { length: number; pixels: number; metresPerPixel: number } | null;
    thumbnail: () => string | null;
  };
}

const ROUND_LENGTHS = [5, 10, 25, 50, 100, 200, 500, 1000];

/** Keeps a picture with the test's output (test-results) and attaches it to the report. */
async function keep(testInfo: TestInfo, name: string, body: Buffer): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  writeFileSync(path, body);
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function groundPoint(page: Page, x: number, y: number): Promise<Point> {
  const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
  if (!point) throw new Error(`ground point ${x}, ${y} is not on screen`);
  return point;
}

/** Waits until the camera has eased to its target (a ground point stops moving). */
async function settle(page: Page): Promise<void> {
  let last = '';
  await expect
    .poll(async () => {
      const now = JSON.stringify(await groundPoint(page, 0, 0));
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [250] })
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true }));
  });
});

test('the scale bar follows the zoom, snaps to round lengths and measures the ground', async ({ page }, testInfo) => {
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  const bar = page.getByTestId('editor-scale-bar');
  const lengths: number[] = [];
  for (const span of [30, 80, 200, 450]) {
    await page.evaluate((s) => (window as unknown as Bridge).__prestesEditor!.look(0, 0, s), span);
    await settle(page);
    await expect.poll(async () => (await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.scaleBar()))?.metresPerPixel ?? 0).toBeGreaterThan(0);
    const scale = (await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.scaleBar()))!;
    expect(ROUND_LENGTHS).toContain(scale.length);
    // A sensible width on screen: under the cap, and over the cap / 2.5 (the widest jump between round lengths).
    expect(scale.pixels).toBeLessThanOrEqual(240);
    expect(scale.pixels).toBeGreaterThan(240 / 2.5);
    // The bar's width is its length on the ground: project two ground points that far apart.
    const a = await groundPoint(page, 0, 0);
    const b = await groundPoint(page, scale.length, 0);
    // (Within 1.5 %: the ground's relief and the top-down tilt's hair off vertical move the projection a little.)
    expect(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) / scale.pixels - 1)).toBeLessThan(0.015);
    // It sits along the bottom of the view.
    const view = (await page.getByTestId('editor-viewport').boundingBox())!;
    const box = (await bar.boundingBox())!;
    expect(box.y + box.height).toBeGreaterThan(view.y + view.height - 30);
    expect(box.x).toBeLessThan(view.x + 30);
    lengths.push(scale.length);
    await keep(testInfo, `scale-bar-span-${span}`, await bar.screenshot());
  }
  // Zooming out lengthens the bar's round number.
  expect(lengths).toEqual([...lengths].sort((x, y) => x - y));
  expect(new Set(lengths).size).toBeGreaterThan(2);
  await keep(testInfo, 'editor-with-scale-bar', await page.screenshot());
});

test('the thumbnail the editor saves carries the scale bar', async ({ page }, testInfo) => {
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  for (const span of [60, 300]) {
    await page.evaluate((s) => (window as unknown as Bridge).__prestesEditor!.look(0, 0, s), span);
    await settle(page);
    const url = await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.thumbnail());
    expect(url?.startsWith('data:image/png;base64,')).toBe(true);
    // The bottom-left corner holds the paper plate with the black bar on it.
    const corner = await page.evaluate(async (source) => {
      const image = new Image();
      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(4, image.height - 40, 90, 36).data;
      let ink = 0;
      let paper = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const [r, g, b] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
        if (r < 50 && g < 50 && b < 50) ink += 1;
        if (r > 225 && g > 215 && b > 185) paper += 1;
      }
      return { size: [image.width, image.height], ink, paper };
    }, url!);
    expect(corner.size).toEqual([256, 256]);
    expect(corner.ink).toBeGreaterThan(150);
    expect(corner.paper).toBeGreaterThan(300);
    await keep(testInfo, `thumbnail-span-${span}`, Buffer.from(url!.split(',')[1]!, 'base64'));
  }
});

test('the desk map shows only the editor print, whole, in the card window', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  const sheet = page.getByTestId('open-skirmish').locator('xpath=..');
  await expect(sheet).toBeVisible();
  const art = sheet.locator('img.desk-map-art');
  const print = sheet.locator('.desk-map-print');
  await expect(print.locator('img.desk-map-thumb')).toBeVisible();
  // The print fills the card's square window (MAP_SHEET_WINDOW: x 26-118, y 8-100 of the 144 x 136 card); the card is plain parchment, so no old drawing shows.
  const size = await art.evaluate((element) => [element.clientWidth, element.clientHeight]);
  const covered = await print.evaluate((element: HTMLElement) => [element.offsetLeft, element.offsetTop, element.clientWidth, element.clientHeight]);
  const [width, height] = size as [number, number];
  const card = { x0: 26, y0: 8, x1: 118, y1: 100 };
  expect(Math.abs(covered[0]! - (width * card.x0) / 144)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(covered[1]! - (height * card.y0) / 136)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(covered[2]! - (width * (card.x1 - card.x0)) / 144)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(covered[3]! - (height * (card.y1 - card.y0)) / 136)).toBeLessThanOrEqual(1.5);
  // The thumbnail shows whole (square), never cropped.
  const thumb = await print.locator('img.desk-map-thumb').evaluate((element) => [element.clientWidth, element.clientHeight]);
  expect(Math.abs(thumb[0]! - thumb[1]!)).toBeLessThanOrEqual(1);
  // The whole map object (the sheet rises above its box), with a margin of desk around it.
  const object = (await page.locator('[data-desk-object="maps"]').boundingBox())!;
  const clip = { x: Math.max(0, object.x - 40), y: Math.max(0, object.y - 40), width: object.width + 80, height: object.height + 80 };
  await keep(testInfo, 'desk-map', await page.screenshot({ clip }));
});
