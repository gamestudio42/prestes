import { expect, test, type Page } from '@playwright/test';

// add-menu-desk: the draggable desk, the start screen.

const DESK_KEY = 'prestes.menu.desk.v1';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('prestes.locale', 'en'));
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.removeItem(key), DESK_KEY);
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
});

test('the desk is the default start screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await expect(page.getByTestId('menu-mark-campaign')).toBeVisible();
  await expect(page.getByTestId('menu-mark-skirmish')).toBeVisible();
});

test('shows the seven desk objects and the four maps', async ({ page }) => {
  for (const id of [
    'menu-mark-campaign',
    'start-codex',
    'menu-mark-references',
    'menu-mark-options',
    'menu-mark-skirmish',
    'desk-gramophone-object',
    'menu-mark-editor',
  ]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  for (const map of ['vila-militar', 'fazenda', 'serra-rio', 'bairro']) {
    await expect(page.getByTestId(`map-option-${map}`)).toBeAttached();
  }
  await expect(page.getByTestId('gramophone-title')).toHaveCount(0);
});

test('opens the campaign and the compendium at the same time and closes one', async ({ page }) => {
  await page.getByTestId('menu-mark-campaign').click();
  await expect(page.getByTestId('campaign-preparing')).toBeVisible();

  // The open campaign fills the screen, so reach the compendium by keyboard.
  await page.locator('[data-desk-object="compendium"] .desk-object-handle').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('codex')).toBeVisible();
  await expect(page.getByTestId('campaign-preparing')).toBeVisible();

  await page.locator('[data-desk-object="compendium"] .desk-object-close').click();
  await expect(page.getByTestId('codex')).toHaveCount(0);
  await expect(page.getByTestId('campaign-preparing')).toBeVisible();
});

test('turns a compendium page', async ({ page }) => {
  await page.getByTestId('start-codex').click();
  const first = await page.getByTestId('codex-page').getAttribute('data-entry');
  await page.getByTestId('book-page-next').click();
  const second = await page.getByTestId('codex-page').getAttribute('data-entry');
  expect(second).not.toBe(first);
  await page.getByTestId('book-page-prev').click();
  await expect(page.getByTestId('codex-page')).toHaveAttribute('data-entry', first!);
});

test('the campaign book opens on its title spread, with contents next and the skirmish action', async ({
  page,
}) => {
  await page.getByTestId('menu-mark-campaign').click();
  await expect(page.getByTestId('start-button')).toBeVisible();
  await page.getByTestId('campaign-page-next').click();
  await expect(page.getByTestId('campaign-contents-0')).toBeVisible();
  await expect(page.getByTestId('start-button')).toHaveCount(0);
  await page.getByTestId('campaign-page-prev').click();
  await page.getByTestId('start-button').click();
  await expect(page.locator('[data-desk-object="maps"] .desk-object-handle')).toBeFocused();
});

test('the reference pile opens its dossier and lists the sources', async ({ page }) => {
  await page.getByTestId('menu-mark-references').click();
  await expect(page.getByTestId('references-screen')).toBeVisible();
  await expect(page.getByTestId('reference-link-macaulay')).toHaveAttribute(
    'href',
    /openlibrary\.org/,
  );
  await expect(page.getByTestId('reference-link-verissimo')).toHaveAttribute(
    'href',
    'https://pt.wikipedia.org/wiki/O_Tempo_e_o_Vento',
  );
  await page.locator('[data-desk-object="references"] .desk-object-close').click();
  await expect(page.getByTestId('references-screen')).toHaveCount(0);
});

test('the compass carries sound and language', async ({ page }) => {
  await page.getByTestId('menu-mark-options').click();
  const audio = page.getByTestId('start-audio');
  await expect(audio).toBeVisible();
  const before = await audio.getAttribute('aria-pressed');
  await audio.click();
  await expect(audio).not.toHaveAttribute('aria-pressed', before ?? '');

  await page.getByTestId('language-select').selectOption('pt-BR');
  await expect(page.getByTestId('menu-mark-campaign')).toContainText('Campanha');
  await expect(page.getByTestId('menu-mark-options')).toContainText('Opções');
});

test('the theodolite opens the map editor', async ({ page }) => {
  await expect(page.getByTestId('menu-mark-editor')).toContainText('Map editor');
  await page.getByTestId('menu-mark-editor').click();
  await expect(page).toHaveURL(/editor\.html$/);
  await expect(page.getByTestId('editor-viewport')).toHaveAttribute('data-ready', 'true', { timeout: 20000 });
});

test('cycles the map fan and starts the 3v3 on the chosen map', async ({ page }) => {
  const active = page.locator('[role="radio"][aria-checked="true"]');
  await expect(active).toHaveAttribute('data-testid', 'map-option-vila-militar');
  await active.click();
  await expect(active).toHaveAttribute('data-testid', 'map-option-fazenda');
  await active.click();
  await expect(active).toHaveAttribute('data-testid', 'map-option-serra-rio');

  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __prestes?: { frame: () => { ferries?: unknown[] } | null } })
            .__prestes?.frame()?.ferries?.length ?? 0,
      ),
    )
    .toBeGreaterThan(0);
});

test('drags an object, remembers the position and tidies the desk', async ({ page }) => {
  const campaign = page.getByTestId('menu-mark-campaign');
  const before = await campaign.boundingBox();
  expect(before).not.toBeNull();

  await page.mouse.move(before!.x + 60, before!.y + 120);
  await page.mouse.down();
  await page.mouse.move(before!.x + 160, before!.y + 220, { steps: 8 });
  await page.mouse.up();
  const moved = await campaign.boundingBox();
  expect(moved!.x).toBeGreaterThan(before!.x + 40);

  await page.reload();
  const persisted = await page.getByTestId('menu-mark-campaign').boundingBox();
  expect(Math.abs(persisted!.x - moved!.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(persisted!.y - moved!.y)).toBeLessThanOrEqual(4);

  await page.getByTestId('menu-desk-reset').click();
  const reset = await page.getByTestId('menu-mark-campaign').boundingBox();
  expect(Math.abs(reset!.x - before!.x)).toBeLessThanOrEqual(4);
  expect(Math.abs(reset!.y - before!.y)).toBeLessThanOrEqual(4);
});

// polish-menu-desk: closed sprites drawn off the 2x standard (none at present).
const PENDING_REDRAW: string[] = [];

test('every closed object is drawn at a whole scale of its sprite, 2x as standard', async ({ page }) => {
  const sprites = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.desk-art-box')].map((box) => {
      const art = box.querySelector<HTMLElement>(
        '.desk-object-art-closed, .desk-gramophone-body, .desk-map-sheet.active',
      )!;
      return {
        id: box.closest<HTMLElement>('[data-desk-object]')!.dataset.deskObject!,
        w: Number(box.dataset.artW),
        h: Number(box.dataset.artH),
        scale: Number(box.dataset.artScale),
        boxW: art.offsetWidth,
        boxH: art.offsetHeight,
      };
    }),
  );
  expect(sprites.map((sprite) => sprite.id).sort()).toEqual(
    ['campaign', 'compendium', 'editor', 'gramophone', 'maps', 'options', 'references'].sort(),
  );
  for (const sprite of sprites) {
    expect(sprite.boxW, sprite.id).toBe(sprite.w * sprite.scale);
    expect(sprite.boxH, sprite.id).toBe(sprite.h * sprite.scale);
    if (!PENDING_REDRAW.includes(sprite.id)) expect(sprite.scale, sprite.id).toBe(2);
  }
});

async function holdCampaign(page: Page) {
  const box = (await page.getByTestId('menu-mark-campaign').boundingBox())!;
  await page.mouse.move(box.x + 80, box.y + 120);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 150, { steps: 6 });
  await expect(page.locator('[data-desk-object="campaign"]')).toHaveAttribute('data-dragging', 'true');
  // Let the 60 ms stepped transition land.
  await page.waitForTimeout(120);
  return page.locator('[data-desk-object="campaign"] .desk-object-art-closed').evaluate((art) => {
    const style = getComputedStyle(art);
    return { translate: style.translate, filter: style.filter };
  });
}

test('a held object lifts one art pixel and drops back on release', async ({ page }) => {
  const art = page.locator('[data-desk-object="campaign"] .desk-object-art-closed');
  const resting = await art.evaluate((element) => getComputedStyle(element).filter);

  const held = await holdCampaign(page);
  expect(held.translate).toBe('0px -2px');
  expect(held.filter).toContain('6px 6px');

  await page.mouse.up();
  await page.waitForTimeout(120);
  const dropped = await art.evaluate((element) => ({
    translate: getComputedStyle(element).translate,
    filter: getComputedStyle(element).filter,
  }));
  expect(dropped.translate).toBe('none');
  expect(dropped.filter).toBe(resting);
  expect(resting).toContain('4px 4px');
});

test('under reduced motion a held object does not lift', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const held = await holdCampaign(page);
  expect(held.translate).toBe('none');
  expect(held.filter).toContain('6px 6px');
  await page.mouse.up();
});

test('opening and closing an object keeps its desk position', async ({ page }) => {
  const compendium = page.getByTestId('start-codex');
  const start = await compendium.boundingBox();
  await page.mouse.move(start!.x + 80, start!.y + 100);
  await page.mouse.down();
  await page.mouse.move(start!.x + 260, start!.y - 40, { steps: 8 });
  await page.mouse.up();
  const placed = await compendium.boundingBox();
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), DESK_KEY);

  await compendium.click();
  await expect(page.getByTestId('codex')).toBeVisible();
  // The open book is centred, and opening it stores nothing new.
  const openBox = await compendium.boundingBox();
  const viewport = page.viewportSize()!;
  expect(Math.abs(openBox!.x + openBox!.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(2);
  expect(Math.abs(openBox!.y + openBox!.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(2);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), DESK_KEY)).toBe(stored);

  // A reload while open keeps the pre-open position.
  await page.reload();
  const reloaded = await page.getByTestId('start-codex').boundingBox();
  expect(reloaded).toEqual(placed);

  await page.getByTestId('start-codex').click();
  await page.locator('[data-desk-object="compendium"] .desk-object-close').click();
  await expect(page.getByTestId('codex')).toHaveCount(0);
  expect(await page.getByTestId('start-codex').boundingBox()).toEqual(placed);
});

test('moves and opens the focused object with the keyboard', async ({ page }) => {
  const campaign = page.getByTestId('menu-mark-campaign');
  const handle = page.locator('[data-desk-object="campaign"] .desk-object-handle');
  await handle.focus();
  const before = await campaign.boundingBox();
  await page.keyboard.press('ArrowRight');
  const after = await campaign.boundingBox();
  expect(after!.x).toBeGreaterThan(before!.x);

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('campaign-preparing')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('campaign-preparing')).toHaveCount(0);
});

test('the desk gramophone opens into its record rack', async ({ page }) => {
  const object = page.getByTestId('desk-gramophone-object');
  await expect(page.getByTestId('gramophone-title')).toHaveCount(0);

  await object.click();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Plangente');
  const play = page.getByTestId('gramophone-play');
  await expect(play).toHaveAttribute('data-state', 'playing');

  await expect(page.getByTestId('gramophone-track-2')).toBeVisible();
  await page.getByTestId('gramophone-track-2').click();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Argentina');
  await expect(play).toHaveAttribute('data-state', 'playing');

  await page.getByTestId('gramophone-next').click();
  await expect(page.getByTestId('gramophone-title')).toHaveText('Menino de Ouro');
});

// polish-menu-desk 7.1: every label sits the same distance below the lowest
// painted pixel of its art. The art is measured as painted (the map fan is
// rotated in 3D), from a screenshot that shows only that object's art.
const ART = 'img.desk-object-art-closed, img.desk-gramophone-body, img.desk-gramophone-grooves, img.desk-map-art';

async function labelGap(page: Page, id: string): Promise<number> {
  const style = await page.addStyleTag({
    content: `
      html, body, #root, .desk-screen, .menu-desk { background: transparent !important; }
      body * { visibility: hidden !important; filter: none !important; animation: none !important; transition: none !important; }
      [data-desk-object="${id}"] :is(${ART}) { visibility: visible !important; }
    `,
  });
  const object = page.locator(`[data-desk-object="${id}"]`);
  const box = (await object.boundingBox())!;
  const clip = { x: Math.floor(box.x), y: Math.floor(box.y), width: Math.ceil(box.width), height: Math.ceil(box.height) };
  const shot = await page.screenshot({ clip, omitBackground: true });
  await style.evaluate((node) => (node as HTMLStyleElement).remove());
  const lowest = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, image.width, image.height).data;
    for (let y = image.height - 1; y >= 0; y -= 1) {
      for (let x = 0; x < image.width; x += 1) {
        if (data[(y * image.width + x) * 4 + 3]! > 128) return y;
      }
    }
    return -1;
  }, shot.toString('base64'));
  const label = (await object.locator('.desk-object-label').boundingBox())!;
  return Math.round(label.y - (clip.y + lowest + 1));
}

test('every closed object keeps the same gap between its art and its label', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  const gaps: Record<string, number> = {};
  for (const id of ['campaign', 'compendium', 'references', 'options', 'maps', 'gramophone', 'editor']) {
    gaps[id] = await labelGap(page, id);
  }
  for (const [id, gap] of Object.entries(gaps)) expect(gap, id).toBe(gaps.campaign);
});

test('the default arrangement places all seven objects in view and apart', async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByTestId('menu-desk-reset').click();
    const boxes: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const id of ['campaign', 'compendium', 'references', 'options', 'maps', 'gramophone', 'editor']) {
      const box = (await page.locator(`[data-desk-object="${id}"]`).boundingBox())!;
      expect(box.x, id).toBeGreaterThanOrEqual(0);
      expect(box.y, id).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, id).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height, id).toBeLessThanOrEqual(viewport.height);
      boxes[id] = box;
    }
    // The reference pile lies between the books and touches no other object.
    const pile = boxes.references!;
    for (const [id, box] of Object.entries(boxes)) {
      if (id === 'references') continue;
      const apart =
        pile.x + pile.width <= box.x ||
        box.x + box.width <= pile.x ||
        pile.y + pile.height <= box.y ||
        box.y + box.height <= pile.y;
      expect(apart, `references and ${id} at ${viewport.width}x${viewport.height}`).toBe(true);
    }
    expect(pile.y).toBeGreaterThan(boxes.campaign!.y);
    expect(pile.y).toBeLessThan(boxes.compendium!.y);
    // add-map-editor: the theodolite touches no other object either.
    const theodolite = boxes.editor!;
    for (const [id, box] of Object.entries(boxes)) {
      if (id === 'editor') continue;
      const apart =
        theodolite.x + theodolite.width <= box.x ||
        box.x + box.width <= theodolite.x ||
        theodolite.y + theodolite.height <= box.y ||
        box.y + box.height <= theodolite.y;
      expect(apart, `editor and ${id} at ${viewport.width}x${viewport.height}`).toBe(true);
    }
  }
});
