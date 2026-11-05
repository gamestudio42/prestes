import { expect, test } from '@playwright/test';

test('issues an area order and an immediate group order', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');

  await page.getByTestId('order-tab-position').click();
  await page.getByTestId('order-defend').click();
  await expect(page.getByTestId('order-hint')).toContainText('tactical order');
  await page.getByTestId('game-canvas').click({
    position: { x: 1000, y: 300 },
  });
  await expect(page.getByTestId('order-value')).toContainText('Defend', { timeout: 5000 });

  await page.getByTestId('order-tab-movement').click();
  await page.getByTestId('order-hold').click();
  await expect(page.getByTestId('order-value')).toContainText('Halt', { timeout: 5000 });
});

test('changes formation without clearing the current order', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');

  await page.getByTestId('formation-wedge').click();
  await expect(page.getByTestId('formation-select')).toHaveAttribute('data-value', 'wedge');

  // Right-click a ground point 12 m east of the section (inside the map).
  const target = await page.evaluate(() => {
    const units = window.__prestes!.frame()!.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1);
    const x = units.reduce((sum, unit) => sum + unit.x, 0) / units.length + 12;
    const y = units.reduce((sum, unit) => sum + unit.y, 0) / units.length;
    return (window as unknown as { __prestesScene: { groundToScreen: (x: number, y: number) => { x: number; y: number } } }).__prestesScene.groundToScreen(x, y);
  });
  await page.getByTestId('game-canvas').click({
    button: 'right',
    position: { x: target.x, y: target.y },
  });
  await expect(page.getByTestId('order-value')).toContainText('Move', { timeout: 5000 });
  await expect(page.getByTestId('formation-select')).toHaveAttribute('data-value', 'wedge');
});
test('toggles passive posture and hold fire', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.waitForFunction(() => Boolean((window as unknown as { __prestes?: unknown }).__prestes));

  await page.getByTestId('posture-aggressive').click();
  await expect(page.getByTestId('posture-aggressive')).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __prestes?: { frame?: () => { units: Array<{ posture?: string; squadId: number }> } } })
          .__prestes?.frame?.()
          ?.units.filter((unit) => unit.squadId === 1)
          .every((unit) => unit.posture === 'aggressive'),
      ),
    )
    .toBe(true);

  await page.getByTestId('hold-fire').click();
  await expect(page.getByTestId('hold-fire')).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __prestes?: { frame?: () => { units: Array<{ holdFire?: boolean; squadId: number }> } } })
          .__prestes?.frame?.()
          ?.units.filter((unit) => unit.squadId === 1)
          .every((unit) => unit.holdFire === true),
      ),
    )
    .toBe(true);

  // Fire on contact, then free fire again (one control, three settings).
  await page.getByTestId('fire-contact').click();
  await expect(page.getByTestId('fire-contact')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('hold-fire')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('fire-free').click();
  await expect(page.getByTestId('fire-free')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('bounding-toggle')).toHaveCount(0);
});
test('shows action names immediately and descriptions after five seconds', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.getByTestId('order-attack').hover();
  await expect(page.getByRole('tooltip')).toContainText('Attack');
  await expect(page.getByRole('tooltip')).not.toContainText('Pick an enemy');

  await page.waitForTimeout(5200);
  await expect(page.getByRole('tooltip')).toContainText('Pick an enemy');
});
test('draws a line formation with Shift held when Move is pending', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.getByTestId('order-tab-movement').click();
  await page.getByTestId('order-move').click();
  await page.mouse.move(620, 420);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(920, 420, { steps: 8 });
  await expect(page.locator('.selection-box')).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.getByTestId('order-value')).toContainText('Move', { timeout: 5000 });
  await expect.poll(() =>
    page.evaluate(
      () =>
        (window as unknown as { __prestes?: { frame?: () => { orders: unknown[] } } })
          .__prestes?.frame?.().orders.length ?? 0,
    ),
  ).toBeGreaterThan(0);
});




test('a drag from the destination turns the section to face that way', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await expect(page.getByTestId('squad-status')).toContainText('Selection: 11/11');

  await page.getByTestId('order-tab-movement').click();
  await page.getByTestId('order-move').click();
  await page.mouse.move(620, 420);
  await page.mouse.down();
  await page.mouse.move(820, 420, { steps: 8 });
  await expect(page.locator('.selection-box')).toHaveCount(0);
  await expect.poll(() => page.getByTestId('game-canvas').getAttribute('data-preview')).not.toBe('0');
  await page.mouse.up();
  await expect(page.getByTestId('order-value')).toContainText('Move', { timeout: 5000 });
  // Every soldier of the section holds the same dragged facing as his aim.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const units = window.__prestes!.frame()!.units.filter((unit) => unit.squadId === 1 && unit.alive);
        const first = units[0]!;
        return (
          first.aimX != null &&
          units.every(
            (unit) => Math.abs((unit.aimX ?? 9) - first.aimX!) < 1e-6 && Math.abs((unit.aimY ?? 9) - first.aimY!) < 1e-6,
          )
        );
      }),
    )
    .toBe(true);
});

test('the drag closes or opens the spacing, shown beside the cursor', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));

  await page.getByTestId('order-tab-movement').click();
  await page.getByTestId('order-move').click();
  await page.mouse.move(500, 420);
  await page.mouse.down();
  await page.mouse.move(520, 420, { steps: 4 });
  // A short drag starts in close order; a longer one opens it.
  const short = Number.parseFloat((await page.getByTestId('drag-spacing').textContent()) ?? '0');
  expect(short).toBeLessThan(2.8);
  await page.mouse.move(900, 420, { steps: 8 });
  const long = Number.parseFloat((await page.getByTestId('drag-spacing').textContent()) ?? '0');
  expect(long).toBeGreaterThan(short);
  await page.mouse.up();
  await expect(page.getByTestId('drag-spacing')).toHaveCount(0);
  await expect(page.getByTestId('order-value')).toContainText('Move', { timeout: 5000 });
});

test('a move marches and an advance goes by bounds', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __prestes?: { frame: () => unknown } }).__prestes?.frame()),
  );

  const ids = await page.evaluate(() =>
    (window as unknown as { __prestes: { frame: () => { units: Array<{ id: number; faction: string; alive: boolean }> } } })
      .__prestes.frame().units
      .filter((unit) => unit.faction === 'column' && unit.alive)
      .map((unit) => unit.id),
  );
  const sendMove = (x: number, y: number): Promise<void> =>
    page.evaluate(
      ({ unitIds, to }) =>
        (window as unknown as {
          __prestes: { command: (command: unknown) => void; step: (ticks: number) => void };
        }).__prestes.command({ type: 'move', unitIds, to }),
      { unitIds: ids, to: { x, y } },
    );
  const boundTeams = (): Promise<Array<string | null>> =>
    page.evaluate(() =>
      (window as unknown as { __prestes: { frame: () => { units: Array<{ faction: string; boundTeam: string | null }> } } })
        .__prestes.frame().units
        .filter((unit) => unit.faction === 'column')
        .map((unit) => unit.boundTeam),
    );

  // A move marches; an advance goes by bounds (compact-orders).
  await sendMove(0, -4);
  await page.evaluate(() =>
    (window as unknown as { __prestes: { step: (ticks: number) => void } }).__prestes.step(3),
  );
  await expect.poll(async () => (await boundTeams()).every((team) => team === null)).toBe(true);

  await page.evaluate(
    ({ unitIds }) =>
      (window as unknown as { __prestes: { command: (command: unknown) => void } }).__prestes.command({
        type: 'order',
        order: 'advance',
        unitIds,
        to: { x: 0, y: 20 },
      }),
    { unitIds: ids },
  );
  await page.evaluate(() =>
    (window as unknown as { __prestes: { step: (ticks: number) => void } }).__prestes.step(3),
  );
  await expect.poll(async () => (await boundTeams()).some((team) => team !== null)).toBe(true);
});
test('splits a UI advance into bounds and clears the order', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.waitForFunction(() => Boolean(window.__prestes?.frame()));
  await page.getByTestId('order-tab-movement').click();
  await page.getByTestId('order-advance').click();
  await page.getByTestId('game-canvas').click({ position: { x: 820, y: 430 } });
  await expect
    .poll(() =>
      page.evaluate(() =>
        new Set(
          window.__prestes
            ?.frame()
            ?.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1)
            .map((unit) => unit.boundTeam)
            .filter((team): team is 'a' | 'b' => team === 'a' || team === 'b') ?? [],
        ).size,
      ),
    )
    .toBe(2);
  await page.getByTestId('order-clear').click();
  await expect(page.getByTestId('order-value')).toContainText('Halt', { timeout: 5000 });
});

test('hides the movement routes and remembers the choice', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect(page.getByTestId('routes-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('routes-toggle').click();
  await expect(page.getByTestId('routes-toggle')).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('routes-toggle')).toHaveAttribute('aria-pressed', 'false');
});
