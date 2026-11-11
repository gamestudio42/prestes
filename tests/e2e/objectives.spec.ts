import { expect, test, type Page } from '@playwright/test';

// add-map-objectives 3.1: the objective layer draws a placeholder flag, the
// area outline at tactical zoom and a capture ring for every objective.

interface Bridge {
  __prestes?: { frame: () => { objectives?: Array<{ id: number; owner: string }> } | null };
  __prestesScene?: {
    objectiveMarks: () => Array<{ id: number; owner: string; value: number; progress: number; side: string | null; contested: boolean; x: number; y: number }>;
    focusOn: (x: number, y: number) => void;
    setBand: (band: 'tactical' | 'strategic') => void;
  };
}

const marks = (page: Page) =>
  page.evaluate(() => (window as unknown as Bridge).__prestesScene?.objectiveMarks() ?? []);

async function startOn(page: Page, map: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId(`map-option-${map}`).click();
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
