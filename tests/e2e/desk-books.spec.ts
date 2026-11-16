import { expect, test, type Page } from '@playwright/test';

// polish-menu-desk: the open books as two-page spreads built from the page
// model. Pages never scroll, every spread shows its page numbers, ribbons and
// the arrow keys turn the book, and the campaign briefing links to the
// compendium.

const DESK_KEY = 'prestes.menu.desk.v1';

async function openDesk(page: Page, locale: 'en' | 'pt-BR' = 'en') {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem('prestes.locale', value);
      window.localStorage.removeItem(key);
    },
    [DESK_KEY, locale] as const,
  );
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
}

/** Turns through every spread and returns the pages whose content overflows. */
async function overflowingPages(page: Page, prefix: string) {
  return page.evaluate(async (prefix) => {
    const found: string[] = [];
    for (let i = 0; i < 400; i += 1) {
      const frame = document.querySelector<HTMLElement>('.desk-book-frame')!;
      for (const body of document.querySelectorAll<HTMLElement>('.desk-book-page-body')) {
        const style = getComputedStyle(body);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          found.push(`spread ${frame.dataset.spread}: scrolls`);
        }
        const over = body.scrollHeight - body.clientHeight;
        const overX = body.scrollWidth - body.clientWidth;
        if (over > 1 || overX > 1) {
          found.push(`spread ${frame.dataset.spread} (${frame.dataset.anchor}) ${body.parentElement?.dataset.testid}: +${over}px`);
        }
      }
      const next = document.querySelector<HTMLButtonElement>(`[data-testid="${prefix}-page-next"]`);
      if (!next || next.disabled) break;
      next.click();
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    }
    return found;
  }, prefix);
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
]) {
  for (const locale of ['en', 'pt-BR'] as const) {
    test(`no page of either book overflows at ${viewport.width}x${viewport.height} in ${locale}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openDesk(page, locale);

      await page.getByTestId('start-codex').click();
      await expect(page.getByTestId('codex')).toBeVisible();
      expect(await overflowingPages(page, 'book')).toEqual([]);
      await page.locator('[data-desk-object="compendium"] .desk-object-close').click();

      await page.getByTestId('menu-mark-campaign').click();
      await expect(page.getByTestId('campaign-book')).toBeVisible();
      expect(await overflowingPages(page, 'campaign')).toEqual([]);
    });
  }
}

test('at the narrow layout an open book stays in the column, inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  await openDesk(page);
  for (const [open, id] of [
    ['start-codex', 'compendium'],
    ['menu-mark-campaign', 'campaign'],
  ] as const) {
    await page.getByTestId(open).click();
    const box = await page.locator(`[data-desk-object="${id}"]`).boundingBox();
    expect(box, id).not.toBeNull();
    expect(box!.x, id).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, id).toBeLessThanOrEqual(820);
    await page.locator(`[data-desk-object="${id}"] .desk-object-close`).click();
  }
});

test('the arrow keys turn one spread and the page numbers follow', async ({ page }) => {
  await openDesk(page);
  await page.getByTestId('start-codex').click();
  const left = page.getByTestId('book-page-left');
  await expect(left).toContainText('p. 1');
  // The opened book holds the focus, so the keys turn it at once.
  await page.keyboard.press('ArrowRight');
  await expect(left).toContainText('p. 3');
  await expect(page.getByTestId('book-page-right')).toContainText('p. 4');
  await page.keyboard.press('ArrowLeft');
  await expect(left).toContainText('p. 1');
});

test('a section ribbon opens that section at its first entry', async ({ page }) => {
  await openDesk(page);
  await page.getByTestId('start-codex').click();
  await page.getByTestId('book-ribbon-events').click();
  await expect(page.getByTestId('codex-page')).toHaveAttribute('data-entry', 'positivismo-militar');
  await page.getByTestId('book-ribbon-contents').click();
  await expect(page.getByTestId('codex-page')).toHaveAttribute('data-entry', 'contents');
});

test('the Miguel Costa entry shows his portrait, credit, label and confidence', async ({ page }) => {
  await openDesk(page);
  await page.getByTestId('start-codex').click();
  await page.getByTestId('codex-tab-figures').click();
  await page.getByTestId('codex-entry-miguel-costa').click();
  await expect(page.getByTestId('codex-page')).toHaveAttribute('data-entry', 'miguel-costa');
  const image = page.getByTestId('book-plate-image');
  await expect(image).toHaveAttribute('src', /miguel-costa\/portrait\.png$/);
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId('book-plate-credit')).toContainText('Public domain');
  const right = page.getByTestId('book-page-right');
  await expect(right).toContainText('Miguel Costa');
  await expect(page.getByTestId('book-label')).toHaveText('Historical');
  await expect(page.getByTestId('book-confidence')).toContainText('high');
});

test('an entry without an image shows the section emblem', async ({ page }) => {
  await openDesk(page);
  await page.getByTestId('start-codex').click();
  await page.getByTestId('codex-tab-places').click();
  await page.getByTestId('codex-entry-porto-nacional').click();
  await expect(page.getByTestId('book-emblem')).toBeVisible();
  await expect(page.getByTestId('book-plate-image')).toHaveCount(0);
});

test('chapter 3 opens with Miguel Costa, and its briefing links to the compendium', async ({ page }) => {
  await openDesk(page);
  await page.getByTestId('menu-mark-campaign').click();
  // The title spread comes first; the contents is the next spread.
  await page.getByTestId('book-ribbon-contents').click();
  await expect(page.getByTestId('campaign-contents-0')).toBeVisible();
  await page.getByTestId('campaign-chapter-a-divisao').click();
  await expect(page.getByTestId('chapter-commander')).toHaveText('Miguel Costa');
  await expect(page.getByTestId('book-label')).toHaveText('Dramatized');
  await expect(page.getByTestId('book-page-right')).toContainText('Benjamin Constant');

  const frame = page.getByTestId('campaign-book').locator('.desk-book-frame');
  await frame.focus();
  for (let i = 0; i < 10 && (await page.getByTestId('chapter-briefing').count()) === 0; i += 1) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByTestId('chapter-briefing')).toBeVisible();
  // make-campaign-playable: chapter 3 stays locked until chapter 2 is won.
  await expect(page.getByTestId('chapter-play-a-divisao')).toHaveCount(0);
  await expect(page.getByTestId('chapter-locked-a-divisao')).toHaveText('Win Chapter 2 first to open this chapter.');

  await page.getByTestId('chapter-link-miguel-costa').click();
  await expect(page.getByTestId('codex')).toBeVisible();
  await expect(page.getByTestId('codex-page')).toHaveAttribute('data-entry', 'miguel-costa');
});

test('a locale switch keeps the same entry open', async ({ page }) => {
  await openDesk(page);
  await page.getByTestId('start-codex').click();
  await page.getByTestId('codex-entry-miguel-costa').click();
  await page.locator('[data-desk-object="options"] .desk-object-handle').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('language-select').selectOption('pt-BR');
  await page.locator('[data-desk-object="options"] .desk-object-close').click();
  await expect(page.getByTestId('codex-page')).toHaveAttribute('data-entry', 'miguel-costa');
  await expect(page.getByTestId('book-label')).toHaveText('Histórico');
});

// make-campaign-playable 1.1, 2.3: a chapter with a map is played from its
// briefing once open; a chapter without one is readable, with no play action.
test('an open chapter with a map plays it; a chapter without one has no play action', async ({ page }) => {
  // Every chapter has a campaign map now. Fixture: the index loses the map of
  // "03 A Divisão" (Porto Mendes becomes a test map), so that chapter has none.
  await page.route(/\/maps\/authored\/index\.ts(\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    // Vite serves the generated module reformatted, so match loosely.
    const body = original.replace(/("?id"?\s*:\s*"porto-mendes"\s*,\s*"?use"?\s*:\s*)"campaign"\s*,\s*"?mission"?\s*:\s*"a-divisao"/, '$1"test"');
    if (body === original) throw new Error(`fixture not applied: ${original.slice(0, 400)}`);
    await route.fulfill({ response, body });
  });
  // Chapters 1 and 2 won, so chapters 2 and 3 are open.
  await page.addInitScript(() => {
    const won = { outcome: 'victory', ticks: 900, columnLost: 2 };
    const chapter = { won: true, plays: 1, last: won, best: won };
    window.localStorage.setItem('prestes.campaign.v1', JSON.stringify({ version: 1, chapters: { 'prologue-18-do-forte': chapter, 'anel-de-ferro': chapter } }));
  });
  await openDesk(page);
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await page.getByTestId('campaign-chapter-a-divisao').click();
  const frame = page.getByTestId('campaign-book').locator('.desk-book-frame');
  await frame.focus();
  for (let i = 0; i < 10 && (await page.getByTestId('chapter-briefing').count()) === 0; i += 1) await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('chapter-briefing')).toBeVisible();
  await expect(page.getByTestId('chapter-play-a-divisao')).toHaveCount(0);
  await expect(page.getByTestId('chapter-locked-a-divisao')).toHaveCount(0);

  await page.getByTestId('book-ribbon-contents').click();
  await page.getByTestId('campaign-chapter-anel-de-ferro').click();
  await frame.focus();
  for (let i = 0; i < 10 && (await page.getByTestId('chapter-play-anel-de-ferro').count()) === 0; i += 1) await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('chapter-play-anel-de-ferro')).toHaveText('Play chapter');
  await page.getByTestId('chapter-play-anel-de-ferro').click();
  await expect(page.getByTestId('hud')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __prestes?: { frame: () => { units: unknown[] } | null } }).__prestes?.frame()?.units.length ?? 0))
    .toBeGreaterThan(0);
});

// enrich-texts-from-sources 4.3: the motto is the campaign book's epigraph.
for (const [locale, motto] of [
  ['en', 'The greatest revolutionary march in the world.'],
  ['pt-BR', 'A maior marcha revolucionária do mundo.'],
] as const) {
  test(`the title spread reads the motto in ${locale}`, async ({ page }) => {
    await openDesk(page, locale);
    await page.getByTestId('menu-mark-campaign').click();
    await expect(page.locator('.desk-book-epigraph')).toHaveText(motto);
  });
}

// enrich-texts-from-sources 4.2: chapter 8 quotes Moreira Lima, with his attribution.
test("chapter 8 quotes Moreira Lima's farewell with its attribution line", async ({ page }) => {
  await openDesk(page);
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await page.getByTestId('campaign-chapter-la-gaiba').click();
  const frame = page.getByTestId('campaign-book').locator('.desk-book-frame');
  await frame.focus();
  // complete-books-and-bibliography: the farewell has its own page ("The Dead"), after the Monument's speech.
  const farewell = page.getByTestId('book-quote').filter({ hasText: 'Soldiers of Liberty!' });
  for (let i = 0; i < 10 && (await farewell.count()) === 0; i += 1) {
    await page.keyboard.press('ArrowRight');
  }
  const quote = farewell.first();
  await expect(quote).toContainText('Soldiers of Liberty!');
  await expect(quote.locator('.desk-quote-attribution')).toContainText('Lourenço Moreira Lima, La Gaiba');
  await expect(quote.locator('.desk-quote-attribution')).toContainText('(translated from the Portuguese)');
});
