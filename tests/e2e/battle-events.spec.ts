import { expect, test, type Page } from '@playwright/test';

// add-battle-events 5.1: an event authored in the editor runs in the playtest.

interface Point {
  x: number;
  y: number;
}
interface Unit {
  id: number;
  faction: string;
  squadId: number;
  alive: boolean;
  x: number;
  y: number;
}
interface Frame {
  units: Unit[];
  phase?: string;
  battleEvents?: { id: number; state: string; firedAt?: number }[];
}
interface Bridge {
  __prestesEditor?: {
    toScreen: (x: number, y: number) => Point | null;
    topDown: () => void;
  };
  __prestes?: { frame: () => Frame | null };
  __prestesScene?: { groundToScreen: (x: number, y: number) => Point; focusOn: (x: number, y: number) => void };
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

async function clickGround(page: Page, x: number, y: number): Promise<void> {
  const point = await screen(page, x, y);
  await page.mouse.click(point.x, point.y);
}

/** Types m:ss in a time field; it is read when the field loses focus. */
async function setClock(page: Page, testId: string, value: string): Promise<void> {
  const field = page.getByTestId(testId);
  await field.fill(value);
  await field.press('Enter');
  await expect(field).toHaveValue(value);
}

test('a reinforcement authored in the editor enters in the playtest; its card pauses the battle; "fire now" brings a column section', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true })));
  await page.goto('/editor.html');
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true');
  await settle(page);

  // A new, unsaved small map (240 m): an objective in the middle, an entry point on the north edge.
  await page.getByTestId('editor-new').click();
  await page.getByTestId('map-id').fill('teste-eventos');
  await page.getByTestId('map-size').selectOption('small');
  await page.getByTestId('map-name-en').fill('Events field');
  await page.getByTestId('map-name-pt').fill('Campo de eventos');
  await page.getByTestId('map-submit').click();
  await settle(page);
  await page.locator('[data-tool="objective"]').click();
  await clickGround(page, 0, 0);
  await page.locator('[data-tool="entry-point"]').click();
  await clickGround(page, 0, -110);
  await expect(page.getByTestId('editor-events')).toBeVisible();
  await expect(page.getByTestId('event-place-1')).toBeVisible();

  // "Reforço legalista": at 0:30, two sections through the entry, for the objective, and a card.
  await page.getByTestId('event-add').click();
  await page.getByTestId('event-label').fill('Reforço legalista');
  await setClock(page, 'event-time', '0:30');
  await page.getByTestId('event-action-kind').selectOption('troops');
  await page.getByTestId('event-action-add').click();
  await page.getByTestId('event-action-0-add-section').click();
  await page.getByTestId('event-action-0-order').selectOption('objective');
  await page.getByTestId('event-action-kind').selectOption('card');
  await page.getByTestId('event-action-add').click();
  await page.getByTestId('event-action-1-title-pt-BR').fill('Reforços inimigos');
  await page.getByTestId('event-action-1-text-pt-BR').fill('Duas seções do Exército chegam pela estrada do norte.');
  await page.getByTestId('event-action-1-title-en').fill('Enemy reinforcements');
  await page.getByTestId('event-action-1-text-en').fill('Two Army sections come down the north road.');
  await expect(page.getByTestId('event-1-summary')).toHaveText(/0:30/);

  // A second event, late, that only "fire now" reaches: a column section through the same entry.
  await page.getByTestId('event-add').click();
  await page.getByTestId('event-label').fill('Coluna chega');
  await setClock(page, 'event-time', '29:00');
  await page.getByTestId('event-action-kind').selectOption('troops');
  await page.getByTestId('event-action-add').click();
  await page.getByTestId('event-action-0-side').selectOption('column');
  await page.getByTestId('event-action-0-order').selectOption('stay');

  await page.getByTestId('editor-validate').click();
  await expect(page.getByTestId('editor-problems')).toBeVisible();
  await expect(page.locator('[data-testid="editor-problems"] li[data-severity="error"]')).toHaveCount(0);

  // Playtest: 66 men at the start, the events listed in the HUD.
  await page.getByTestId('editor-playtest').click();
  await page.waitForURL(/index\.html\?playtest=1/);
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect.poll(async () => (await frame(page))?.units.length ?? 0).toBe(66);
  await expect(page.getByTestId('playtest-events')).toBeVisible();
  await expect(page.getByTestId('playtest-event-1')).toHaveAttribute('data-state', 'waiting');
  await page.getByTestId('start-battle').click();
  await expect.poll(async () => (await frame(page))?.phase).toBe('battle');

  // At ×8 the card comes after about four seconds and pauses the battle; closing it resumes at ×8.
  await page.getByTestId('speed-8').click();
  await expect(page.getByTestId('event-card')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('event-card-title')).toHaveText(/Reforços inimigos|Enemy reinforcements/);
  await expect(page.getByTestId('speed-8')).not.toHaveClass(/active/);
  await expect(page.getByTestId('playtest-event-1')).toHaveAttribute('data-state', 'fired');
  await page.getByTestId('event-card-close').click();
  await expect(page.getByTestId('event-card')).toHaveCount(0);
  await expect(page.getByTestId('speed-8')).toHaveClass(/active/);
  // The two legalist sections come in, one after the other.
  await expect
    .poll(async () => (await frame(page))!.units.filter((unit) => unit.faction === 'legalist').length, { timeout: 20_000 })
    .toBeGreaterThan(33);
  await page.getByTestId('speed-1').click();

  // "Fire now": the column section enters at the north edge and shows in the troop panel.
  const columnSquads = new Set((await frame(page))!.units.filter((unit) => unit.faction === 'column').map((unit) => unit.squadId));
  await page.getByTestId('playtest-event-2-fire').click();
  await expect(page.getByTestId('playtest-event-2')).toHaveAttribute('data-state', 'fired');
  await expect
    .poll(async () => (await frame(page))!.units.some((unit) => unit.faction === 'column' && !columnSquads.has(unit.squadId)), { timeout: 15_000 })
    .toBe(true);
  const arrived = (await frame(page))!.units.find((unit) => unit.faction === 'column' && !columnSquads.has(unit.squadId))!;
  expect(arrived.y).toBeLessThan(-90);
  const card = page.getByTestId(`squad-${arrived.squadId}`);
  await expect(card).toBeVisible();
  await card.click();
  await expect(card).toHaveAttribute('aria-pressed', 'true');

  // Ordered from the troop panel: a right-click 20 m south moves it (the camera looks there first).
  const ground = await page.evaluate((squadId) => {
    const units = (window as unknown as Bridge).__prestes!.frame()!.units.filter((unit) => unit.faction === 'column' && unit.squadId === squadId && unit.alive);
    return { x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length, y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length + 20 };
  }, arrived.squadId);
  await page.evaluate(({ x, y }) => (window as unknown as Bridge).__prestesScene!.focusOn(x, y), ground);
  await page.waitForTimeout(800);
  const target = await page.evaluate(({ x, y }) => (window as unknown as Bridge).__prestesScene!.groundToScreen(x, y), ground);
  await page.mouse.click(target.x, target.y, { button: 'right' });
  // The legalists that came in through the same entry may stand there: a move or an attack, any order counts.
  await expect(page.getByTestId('order-value')).toContainText(/Move|Mover|Attack|Atacar/, { timeout: 5000 });
});
