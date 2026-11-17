import { expect, test, type Page } from '@playwright/test';

// pre-battle-roster 5.1, 5.5, 5.6: the skirmish setup screen opened from the desk.

interface Bridge {
  __prestes?: {
    frame: () => { units: Array<{ id: number; faction: string; squadId: number; weaponId: string }> } | null;
  };
}

const units = (page: Page) => page.evaluate(() => (window as unknown as Bridge).__prestes?.frame()?.units ?? []);

async function openSetup(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByTestId('open-skirmish').click();
  await expect(page.getByTestId('skirmish-setup')).toBeVisible();
}

/** scale-forces-by-map-size: Paiolzinho is a small map (33 men, 6 sections); the test map is medium (66, 12). */
const SMALL_MAP = 'paiolzinho';

async function clearRoster(page: Page): Promise<void> {
  while ((await page.getByTestId('roster-remove-0').count()) > 0) await page.getByTestId('roster-remove-0').click();
}

test('back to the desk', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId('setup-back').click();
  await expect(page.getByTestId('skirmish-setup')).toHaveCount(0);
  await expect(page.getByTestId('open-skirmish')).toBeVisible();
  await page.getByTestId('open-skirmish').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('skirmish-setup')).toHaveCount(0);
  await expect(page.getByTestId('hud')).toHaveCount(0);
});

test('builds a six-section force on a small map and fights with it', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId(`map-option-${SMALL_MAP}`).click();
  await clearRoster(page);
  for (const type of ['comando', 'esquadra-5', 'esquadra-5', 'irregulares', 'irregulares', 'irregulares']) {
    await page.getByTestId(`roster-add-${type}`).click();
  }
  await expect(page.getByTestId('roster-counters')).toContainText('29/33');
  await expect(page.getByTestId('roster-counters')).toContainText('6/6');
  // A third automatic rifle and a seventh section are refused, with the reason shown.
  await expect(page.getByTestId('roster-refusal-fuzil-metralhador')).toBeVisible();
  // A refused type is aria-disabled: the click goes through and changes nothing.
  await page.getByTestId('roster-add-esquadra-4').click({ force: true });
  await expect(page.getByTestId('roster-row-6')).toHaveCount(0);

  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect.poll(async () => (await units(page)).filter((unit) => unit.faction === 'column').length).toBe(29);
  for (let squad = 1; squad <= 6; squad += 1) await expect(page.getByTestId(`squad-${squad}`)).toBeAttached();
});

test('budget refuses an addition', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId(`map-option-${SMALL_MAP}`).click();
  await expect(page.getByTestId('roster-counters')).toContainText('33/33');
  await expect(page.getByTestId('roster-refusal-esquadra-4')).toContainText('33');
  await page.getByTestId('roster-add-esquadra-4').click({ force: true });
  await expect(page.getByTestId('roster-row-3')).toHaveCount(0);
  await page.getByTestId('roster-remove-2').click();
  await page.getByTestId('roster-add-esquadra-4').click();
  await expect(page.getByTestId('roster-row-2')).toBeVisible();
  await expect(page.getByTestId('roster-counters')).toContainText('26/33');
});

// scale-forces-by-map-size 3.1: the counters and the start follow the chosen map's size.
for (const [locale, men] of [
  ['pt-BR', 'Homens 41/66'],
  ['en', 'Men 41/66'],
] as const) {
  test(`a medium map holds more (${locale})`, async ({ page }) => {
    await page.addInitScript((value) => window.localStorage.setItem('prestes.locale', value), locale);
    await openSetup(page);
    await page.getByTestId('map-option-campo-de-provas').click();
    await clearRoster(page);
    for (const type of ['fuzileiros', 'fuzileiros', 'esquadra-4', 'esquadra-4', 'fuzileiros']) await page.getByTestId(`roster-add-${type}`).click();
    await expect(page.getByTestId('roster-counters')).toContainText(men);
    await expect(page.getByTestId('roster-counters')).toContainText('5/12');
    // A second machine gun is taken on a medium map, a third refused.
    await page.getByTestId('roster-add-metralhadora').click();
    await page.getByTestId('roster-add-metralhadora').click();
    await expect(page.getByTestId('roster-row-6')).toBeVisible();
    await expect(page.getByTestId('roster-refusal-metralhadora')).toContainText(/2/);
    await expect(page.getByTestId('roster-over')).toHaveCount(0);
    await expect(page.getByTestId('start-battle-3v3')).toBeEnabled();
  });
}

test('changing to a smaller map keeps the force and waits until it fits', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId('map-option-campo-de-provas').click();
  await clearRoster(page);
  for (const type of ['fuzileiros', 'fuzileiros', 'fuzileiros', 'fuzileiros', 'esquadra-4']) await page.getByTestId(`roster-add-${type}`).click();
  await page.getByTestId(`map-option-${SMALL_MAP}`).click();
  await expect(page.getByTestId('roster-row-4')).toBeVisible();
  await expect(page.getByTestId('roster-over')).toContainText('33');
  await expect(page.getByTestId('start-battle-3v3')).toBeDisabled();
  // Two rifle sections out: 26 men fit, and the battle may start.
  await page.getByTestId('roster-remove-0').click();
  await page.getByTestId('roster-remove-0').click();
  await expect(page.getByTestId('roster-over')).toHaveCount(0);
  await expect(page.getByTestId('start-battle-3v3')).toBeEnabled();
});

test('a twelve-section company fights on the test map, its cards scroll in the Troops window', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openSetup(page);
  await page.getByTestId('map-option-campo-de-provas').click();
  await clearRoster(page);
  for (const type of ['comando', 'metralhadora', 'metralhadora', 'esquadra-5', 'fuzil-metralhador', 'fuzileiros', 'fuzileiros', 'irregulares', 'esquadra-4', 'esquadra-5', 'esquadra-4', 'irregulares']) {
    await page.getByTestId(`roster-add-${type}`).click();
  }
  await expect(page.getByTestId('roster-counters')).toContainText('65/66');
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect.poll(async () => (await units(page)).filter((unit) => unit.faction === 'column').length).toBe(65);
  // The owner's choice (2026-11-17): the cards keep their size and scroll inside the window.
  const troops = page.locator("[data-window='troops']");
  const body = troops.locator('.docked-panel-body');
  const box = await troops.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(720);
  expect(await body.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await expect(page.getByTestId('squad-106')).not.toBeInViewport({ ratio: 1 });
  await page.getByTestId('squad-1').hover();
  await page.mouse.wheel(0, 2000);
  await expect(page.getByTestId('squad-106')).toBeInViewport({ ratio: 0.95 });
  // Every card is there to scroll to, and the window did not grow over the map.
  for (const squad of [1, 2, 3, 4, 5, 6, 101, 102, 103, 104, 105, 106]) await expect(page.getByTestId(`squad-${squad}`)).toBeAttached();
  expect((await troops.boundingBox())!.height).toBe(box!.height);
  await troops.screenshot({ path: testInfo.outputPath('twelve-cards.png') });
});

test('roster remembered', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId('map-option-campo-de-provas').click();
  await clearRoster(page);
  await page.getByTestId('roster-add-metralhadora').click();
  await page.getByTestId('roster-add-comando').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await openSetup(page);
  await expect(page.getByTestId('map-option-campo-de-provas')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('roster-row-0')).toContainText(/Peça de metralhadora/);
  await expect(page.getByTestId('roster-row-1')).toContainText(/Comando|Command/);
  await expect(page.getByTestId('roster-row-2')).toHaveCount(0);
});

test('enemy chosen: the test map with force C', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId('map-option-campo-de-provas').click();
  await page.getByTestId('enemy-preset-2').check();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect.poll(async () => (await units(page)).length).toBeGreaterThan(0);
  const legalists = (await units(page)).filter((unit) => unit.faction === 'legalist');
  // Two provisional sections, an army rifle section and two automatic-rifle squads.
  expect(legalists).toHaveLength(33);
  expect(new Set(legalists.map((unit) => unit.squadId)).size).toBe(5);
  expect(legalists.filter((unit) => unit.weaponId === 'winchester-44')).toHaveLength(8);
});

test('enemy built: a second machine gun is refused', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId(`map-option-${SMALL_MAP}`).click();
  await page.getByTestId('enemy-built').check();
  await expect(page.getByTestId('enemy-roster-builder')).toBeVisible();
  await page.getByTestId('enemy-roster-remove-0').click();
  await page.getByTestId('enemy-roster-add-metralhadora-legalista').click();
  await expect(page.getByTestId('enemy-roster-refusal-metralhadora-legalista')).toContainText(/metralhadora|machine gun/);
  await page.getByTestId('enemy-roster-add-metralhadora-legalista').click({ force: true });
  await expect(page.getByTestId('enemy-roster-row-3')).toHaveCount(0);
  // Choosing the map again keeps a built enemy.
  await page.getByTestId('map-option-campo-de-provas').click();
  await expect(page.getByTestId('enemy-roster-row-2')).toBeVisible();
});

// faction-armies 4.3: the enemy builder offers only the chosen army's types.
test('enemy built: the patriotic army offers only its own types', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId('enemy-built').check();
  await expect(page.getByTestId('enemy-roster-add-infantaria-exercito')).toBeVisible();
  await page.getByTestId('enemy-army-patriotico').check();
  await expect(page.getByTestId('enemy-roster-add-jaguncos')).toBeVisible();
  await expect(page.getByTestId('enemy-roster-add-infantaria-exercito')).toHaveCount(0);
});

// pre-battle-roster 5.2: the HUD names rostered troops and lists a mixed section's weapons.
test('weapon card shows the mix', async ({ page }) => {
  await openSetup(page);
  await page.getByTestId('map-option-campo-de-provas').click();
  await clearRoster(page);
  await page.getByTestId('roster-add-esquadra-5').click();
  await page.getByTestId('roster-add-metralhadora').click();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();

  await page.getByTestId('squad-1').click();
  await expect(page.getByTestId('squad-name-1')).toContainText(/Fogão com fuzil-metralhador/);
  await expect(page.getByTestId('weapon-line-mauser-7mm')).toContainText('×4');
  await expect(page.getByTestId('weapon-line-fuzil-automatico-7mm')).toContainText('20/120');
  await expect(page.getByTestId('gun-state')).toHaveCount(0);

  await page.getByTestId('squad-2').click();
  await expect(page.getByTestId('squad-name-2')).toContainText(/Peça de metralhadora/);
  await expect(page.getByTestId('weapon-line-metralhadora-7mm')).toContainText('250/250');
  await expect(page.getByTestId('gun-state')).toContainText(/montando|pronta|em movimento|setting up|ready|moving/);
  await expect(page.getByTestId('gun-pool')).toContainText('750');
  // A man's tooltip names his weapon.
  await expect(page.locator('[data-testid^="helmet-"][data-weapon="metralhadora-7mm"]')).toHaveCount(1);
});

// troop-thumbnails-and-panel 2.1-2.2: the types read as cards with their picture,
// weapon icons by kind and the reason a type is refused, in both languages.
for (const [locale, refusal] of [
  ['en', /33/],
  ['pt-BR', /33/],
] as const) {
  test(`type cards with thumbnails and weapon icons (${locale})`, async ({ page }) => {
    await page.addInitScript((value) => window.localStorage.setItem('prestes.locale', value), locale);
    await openSetup(page);
    await page.getByTestId(`map-option-${SMALL_MAP}`).click();
    const thumb = page.getByTestId('roster-thumb-metralhadora');
    await expect(thumb).toBeVisible();
    await expect(thumb).toHaveAttribute('src', /assets\/sections\/metralhadora\.png\?v=[\w-]+$/);
    // The picture loaded (a missing file has no natural size).
    await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(96);
    const gun = page.getByTestId('roster-add-metralhadora');
    await expect(gun.locator('[data-weapon="machine-gun"]')).toContainText('1');
    await expect(gun.locator('[data-weapon="bolt-rifle"]')).toContainText('3');
    await expect(page.getByTestId('roster-add-irregulares').locator('[data-weapon="lever-rifle"]')).toContainText('5');
    await expect(page.getByTestId('roster-add-comando').locator('[data-weapon="pistol"]')).toContainText('1');
    // The full default roster refuses another type and says why.
    await expect(page.getByTestId('roster-refusal-esquadra-4')).toContainText(refusal);
    // Roster rows carry the type's picture.
    await expect(page.getByTestId('roster-row-0').locator('img.roster-row-thumb')).toHaveAttribute('src', /assets\/sections\/[a-z0-9-]+\.png\?v=[\w-]+$/);
    // Arrow keys still walk the cards.
    await page.getByTestId('roster-add-comando').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('roster-add-fuzileiros')).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByTestId('roster-add-veteranos-gauchos')).toBeFocused();
  });
}
