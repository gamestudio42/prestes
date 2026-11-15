import { expect, test, type Page } from '@playwright/test';

// add-artillery-bombardment 5.2: a bombardment authored in the editor shells its area in the playtest.

interface Point {
  x: number;
  y: number;
}
interface Frame {
  phase?: string;
  units: { id: number; hp: number; alive: boolean }[];
  covers: { kind: string }[];
}
interface Bridge {
  __prestesEditor?: { toScreen: (x: number, y: number) => Point | null; topDown: () => void };
  __prestes?: { frame: () => Frame | null };
}

const frame = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestes!.frame());

async function screen(page: Page, x: number, y: number): Promise<Point> {
  const point = await page.evaluate(([px, py]) => (window as unknown as Bridge).__prestesEditor!.toScreen(px!, py!), [x, y]);
  if (!point) throw new Error(`ground point ${x}, ${y} is not on screen`);
  return point;
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.topDown());
  let last = '';
  await expect
    .poll(async () => {
      const now = JSON.stringify(await screen(page, 0, 0));
      const still = now === last;
      last = now;
      return still;
    }, { intervals: [250] })
    .toBe(true);
}

test('a bombardment authored in the editor shells its area in the playtest and leaves craters', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await settle(page);

  // A new small map (240 m) with a trigger area on the column's side of the field.
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('teste-artilharia');
  await page.getByTestId('map-size').selectOption('small');
  await page.getByTestId('map-name-en').fill('Artillery field');
  await page.getByTestId('map-name-pt').fill('Campo de artilharia');
  await page.getByTestId('map-submit').click();
  await settle(page);
  await page.locator('[data-tool="event-area"]').click();
  const at = await screen(page, 0, 0);
  await page.mouse.click(at.x, at.y);
  await expect(page.getByTestId('editor-events')).toBeVisible();

  // "Bombardeio": late, so only "fire now" starts it; legalist 105 mm on the area, 30 a minute, wide.
  await page.getByTestId('event-add').click();
  await page.getByTestId('event-label').fill('Bombardeio');
  await page.getByTestId('event-time').fill('29:00');
  await page.getByTestId('event-time').press('Enter');
  await page.getByTestId('event-action-kind').selectOption('bombardment');
  await page.getByTestId('event-action-add').click();
  await page.getByTestId('event-action-0-gun').selectOption('howitzer-105');
  await page.getByTestId('event-action-0-rate').fill('30');
  await page.getByTestId('event-action-0-spread').fill('60');
  await expect(page.getByTestId('event-1-summary')).toHaveText(/30\/min/);

  await page.getByTestId('editor-validate').click();
  await expect(page.locator('[data-testid="editor-problems"] li[data-severity="error"]')).toHaveCount(0);

  // Playtest: fire it now and watch the shells land.
  await page.getByTestId('editor-playtest').click();
  await page.waitForURL(/index\.html\?playtest=1/);
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.getByTestId('start-battle').click();
  await expect.poll(async () => (await frame(page))?.phase).toBe('battle');
  await page.getByTestId('speed-8').click();
  await page.getByTestId('playtest-event-1-fire').click();
  await expect(page.getByTestId('playtest-event-1')).toHaveAttribute('data-state', 'fired');
  await expect.poll(async () => (await frame(page))!.covers.filter((cover) => cover.kind === 'crater').length, { timeout: 30_000 }).toBeGreaterThan(3);
});
