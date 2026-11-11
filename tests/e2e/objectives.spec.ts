import { expect, test, type Page } from '@playwright/test';

// add-map-objectives 3.1: the objective layer draws a placeholder flag, the
// area outline at tactical zoom and a capture ring for every objective.

interface Bridge {
  __prestes?: {
    frame: () => {
      objectives?: Array<{ id: number; owner: string }>;
      units: Array<{ id: number; faction: string; squadId: number }>;
    } | null;
    command: (command: unknown) => void;
    step: (ticks: number) => void;
  };
  __prestesScene?: {
    objectiveMarks: () => Array<{ id: number; owner: string; value: number; progress: number; side: string | null; contested: boolean; x: number; y: number }>;
    focusOn: (x: number, y: number) => void;
    setBand: (band: 'tactical' | 'strategic') => void;
  };
}

const marks = (page: Page) =>
  page.evaluate(() => (window as unknown as Bridge).__prestesScene?.objectiveMarks() ?? []);

async function startOn(page: Page, map: string, timeLimit?: number): Promise<void> {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId(`map-option-${map}`).click();
  if (timeLimit !== undefined) await page.getByTestId(`time-limit-${timeLimit}`).click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.getByTestId('start-battle').click();
  await expect.poll(async () => (await marks(page)).length).toBeGreaterThan(0);
}

test('draws the flags, owners and tactical outline of the test map objectives', async ({ page }) => {
  await startOn(page, 'campo-de-provas');
  const shown = await marks(page);
  expect(shown.map((mark) => mark.id)).toEqual([1, 2, 3, 4, 5]);
  expect(shown.map((mark) => mark.value)).toEqual([2, 2, 3, 1, 1]);
  expect(shown.map((mark) => mark.owner)).toEqual(['neutral', 'neutral', 'legalist', 'legalist', 'column']);
  expect(shown.every((mark) => mark.side === null && !mark.contested)).toBe(true);

  // Frame the church, the legalist value-3 objective, at tactical zoom.
  const church = shown.find((mark) => mark.id === 3)!;
  await page.evaluate(
    ({ x, y }) => {
      const scene = (window as unknown as Bridge).__prestesScene!;
      scene.setBand('tactical');
      scene.focusOn(x, y);
    },
    { x: church.x, y: church.y },
  );
  await page.waitForTimeout(1200);
  await page.locator('canvas').first().screenshot({ path: 'test-results/objectives-campo-de-provas.png' });

  // The bridge (neutral) and the houses (the column's) at tactical zoom: the
  // cloth takes the owner's colour and the outline follows it.
  for (const [id, path] of [
    [1, 'test-results/objectives-bridge.png'],
    [5, 'test-results/objectives-houses.png'],
  ] as const) {
    const mark = shown.find((entry) => entry.id === id)!;
    await page.evaluate(
      ({ x, y }) => {
        const scene = (window as unknown as Bridge).__prestesScene!;
        scene.setBand('tactical');
        scene.focusOn(x, y);
      },
      { x: mark.x, y: mark.y },
    );
    await page.waitForTimeout(1200);
    await page.locator('canvas').first().screenshot({ path });
  }
});

// add-map-objectives 3.2: the strip shows the owner the simulation has, and the clock runs.
test('the objective strip follows an owner change and shows the clock', async ({ page }) => {
  await startOn(page, 'campo-de-provas', 9000);
  await expect(page.getByTestId('objective-strip')).toBeVisible();
  await expect(page.getByTestId('objective-icon-3')).toHaveAttribute('data-owner', 'legalist');
  await expect(page.getByTestId('battle-clock')).toHaveText('15:00');
  // add-map-objectives 3.2: the tooltip is localized, PT-BR as well as EN.
  await page.getByTestId('hud-language-select').selectOption('pt-BR');
  await expect(page.getByTestId('objective-icon-3')).toHaveAttribute('title', 'Igreja, valor 3');
  await page.getByTestId('hud-language-select').selectOption('en');

  // The column walks onto the bridge; the strip takes its colour.
  await page.evaluate(() => {
    const bridge = (window as unknown as Bridge).__prestes!;
    const units = bridge.frame()!.units.filter((unit) => unit.faction === 'column').map((unit) => unit.id);
    bridge.command({ type: 'move', unitIds: units, to: { x: 60, y: 7 } });
    bridge.step(1500);
  });
  await expect.poll(async () => page.getByTestId('objective-icon-1').getAttribute('data-owner'), { timeout: 90_000 }).toBe('column');
  await expect(page.getByTestId('battle-clock')).not.toHaveText('15:00');
});

// add-map-objectives 3.3: the time limit and the objectives before the battle.
test('the setup screen offers the time limit and the objectives of the field', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await expect(page.getByTestId('time-limit-9000')).toBeVisible();
  await page.getByTestId('time-limit-9000').click();
  await expect(page.getByTestId('time-limit-9000')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('setup-objectives').locator('li')).toHaveCount(5);
  await expect(page.getByTestId('setup-objective-3')).toContainText('Church');
  await expect(page.locator('[data-testid^="setup-objective-flag-"]')).toHaveCount(5);
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.getByTestId('battle-clock')).toHaveText('15:00');
});

// add-map-objectives 3.4: the clock ends the battle and the panel says it was the objectives.
test('the end panel says the battle was decided on the objectives', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('time-limit-9000').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.getByTestId('start-battle').click();
  await page.evaluate(() => (window as unknown as Bridge).__prestes!.step(9000));
  await expect(page.getByTestId('battle-end')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByTestId('battle-end-decided')).toBeVisible();
  await expect(page.getByTestId('battle-end-objectives').locator('tbody tr')).toHaveCount(5);
  await expect(page.getByTestId('battle-end-objective-total')).toBeVisible();
});