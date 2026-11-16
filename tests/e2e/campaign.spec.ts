import { expect, test, type Page } from '@playwright/test';

// make-campaign-playable 2.2-2.4: playing the campaign from the book, the kept
// result, unlocking by victory, the debrief actions and restarting.

type Bridge = {
  endBattle: (outcome: 'victory' | 'defeat' | 'draw', decidedBy?: string) => void;
  frame: () => { units: unknown[] } | null;
};

/** A fresh campaign, muted, in English; the record is cleared once, not on every reload. */
async function openDesk(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('campaign-e2e-ready')) return;
    sessionStorage.setItem('campaign-e2e-ready', '1');
    localStorage.setItem('prestes.locale', 'en');
    localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
    localStorage.removeItem('prestes.campaign.v1');
  });
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
}

/** Opens the campaign book (if closed) at a chapter's briefing. */
async function openBriefing(page: Page, chapterId: string) {
  if ((await page.getByTestId('book-ribbon-contents').count()) === 0) {
    await page.getByTestId('menu-mark-campaign').click();
  }
  await page.getByTestId('book-ribbon-contents').click();
  await page.getByTestId(`campaign-chapter-${chapterId}`).click();
  const frame = page.getByTestId('campaign-book').locator('.desk-book-frame');
  await frame.focus();
  for (let i = 0; i < 12 && (await page.getByTestId('chapter-briefing').count()) === 0; i += 1) await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('chapter-briefing')).toBeVisible();
}

async function waitForBattle(page: Page) {
  await expect(page.getByTestId('hud')).toBeVisible();
  // A campaign start fetches its map first, so the previous battle's client
  // (frozen on its stubbed end) can still answer for a moment: wait for a
  // frame other than the one the last wait accepted.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const host = window as unknown as { __prestes?: Bridge; __e2eBattleFrame?: unknown };
        const frame = host.__prestes?.frame();
        if (!frame || frame.units.length === 0 || frame === host.__e2eBattleFrame) return false;
        host.__e2eBattleFrame = frame;
        return true;
      }),
    )
    .toBe(true);
}

const endBattle = (page: Page, outcome: 'victory' | 'defeat' | 'draw', decidedBy: string) =>
  page.evaluate(([o, d]) => (window as unknown as { __prestes: Bridge }).__prestes.endBattle(o as 'victory', d), [outcome, decidedBy] as const);

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('prestes.campaign.v1') ?? 'null'));

test('the prologue is played from the book; a victory opens chapter 2 and is kept', async ({ page }) => {
  test.setTimeout(120_000);
  await openDesk(page);
  await page.getByTestId('menu-mark-campaign').click();
  await expect(page.getByTestId('campaign-how-open')).toBeVisible();
  await page.getByTestId('book-ribbon-contents').click();
  await expect(page.getByTestId('campaign-seal-prologue-18-do-forte')).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('campaign-seal-anel-de-ferro')).toHaveAttribute('data-state', 'locked');
  await expect(page.getByTestId('campaign-seal-anel-de-ferro')).toContainText('locked');

  await openBriefing(page, 'anel-de-ferro');
  await expect(page.getByTestId('chapter-locked-anel-de-ferro')).toHaveText('Win Prologue first to open this chapter.');
  await expect(page.getByTestId('chapter-play-anel-de-ferro')).toHaveCount(0);

  await openBriefing(page, 'prologue-18-do-forte');
  await expect(page.getByTestId('chapter-play-prologue-18-do-forte')).toHaveText('Play chapter');
  await page.getByTestId('chapter-play-prologue-18-do-forte').click();
  await waitForBattle(page);

  await endBattle(page, 'victory', 'objectives');
  await expect(page.getByTestId('battle-end-result')).toHaveText('Victory');
  await expect(page.getByTestId('battle-end-chapter')).toContainText('Prologue');
  await expect(page.getByTestId('battle-end-epilogue')).toBeVisible();
  await expect(page.getByTestId('battle-end-next-chapter')).toContainText('Chapter 2');
  await expect(page.getByTestId('battle-end-restart')).toHaveText('Play again');
  await expect(page.getByTestId('battle-end-back-to-book')).toBeVisible();
  const record = await stored(page);
  expect(record.version).toBe(1);
  expect(record.chapters['prologue-18-do-forte']).toMatchObject({ won: true, plays: 1, last: { outcome: 'victory', decidedBy: 'objectives' } });

  // "Next chapter" starts chapter 2.
  await page.getByTestId('battle-end-next-chapter').click();
  await waitForBattle(page);
  await expect(page.getByTestId('battle-end')).toHaveCount(0);

  // A defeat offers only "Play again" and "Back to the book", which opens the chapter's briefing.
  await endBattle(page, 'defeat', 'commander');
  await expect(page.getByTestId('battle-end-result')).toHaveText('Defeat');
  await expect(page.getByTestId('battle-end-next-chapter')).toHaveCount(0);
  await expect(page.getByTestId('battle-end-menu')).toHaveCount(0);
  await page.getByTestId('battle-end-back-to-book').click();
  await expect(page.getByTestId('chapter-briefing')).toBeVisible();
  await expect(page.getByTestId('chapter-play-anel-de-ferro')).toBeVisible();
  expect((await stored(page)).chapters['anel-de-ferro']).toMatchObject({ won: false, plays: 1, last: { outcome: 'defeat', decidedBy: 'commander' } });

  // The progress survives a reload.
  await page.reload();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await expect(page.getByTestId('campaign-seal-prologue-18-do-forte')).toHaveAttribute('data-state', 'won');
  await expect(page.getByTestId('campaign-seal-anel-de-ferro')).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('campaign-seal-a-divisao')).toHaveAttribute('data-state', 'locked');
});

test('Play again replays the chapter and records it again', async ({ page }) => {
  test.setTimeout(90_000);
  await openDesk(page);
  await openBriefing(page, 'prologue-18-do-forte');
  await page.getByTestId('chapter-play-prologue-18-do-forte').click();
  await waitForBattle(page);
  await endBattle(page, 'draw', 'draw');
  await expect(page.getByTestId('battle-end-next-chapter')).toHaveCount(0);
  await page.getByTestId('battle-end-restart').click();
  await waitForBattle(page);
  await expect(page.getByTestId('battle-end')).toHaveCount(0);
  await endBattle(page, 'victory', 'broken');
  await expect(page.getByTestId('battle-end-next-chapter')).toBeVisible();
  expect((await stored(page)).chapters['prologue-18-do-forte']).toMatchObject({
    won: true,
    plays: 2,
    last: { outcome: 'victory' },
    best: { outcome: 'victory' },
  });
});

test('restart campaign asks first; cancel keeps the record, confirm clears it', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('campaign-e2e-seeded')) return;
    sessionStorage.setItem('campaign-e2e-seeded', '1');
    localStorage.setItem('prestes.locale', 'en');
    const won = { outcome: 'victory', ticks: 900, columnLost: 3 };
    localStorage.setItem('prestes.campaign.v1', JSON.stringify({ version: 1, chapters: { 'prologue-18-do-forte': { won: true, plays: 1, last: won, best: won } } }));
  });
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await expect(page.getByTestId('campaign-seal-anel-de-ferro')).toHaveAttribute('data-state', 'open');

  await page.getByTestId('campaign-restart').click();
  await expect(page.getByTestId('campaign-restart-confirm')).toBeVisible();
  await page.getByTestId('campaign-restart-no').click();
  await expect(page.getByTestId('campaign-seal-anel-de-ferro')).toHaveAttribute('data-state', 'open');
  expect(await stored(page)).not.toBeNull();

  await page.getByTestId('campaign-restart').click();
  await page.getByTestId('campaign-restart-yes').click();
  await expect(page.getByTestId('campaign-seal-prologue-18-do-forte')).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('campaign-seal-anel-de-ferro')).toHaveAttribute('data-state', 'locked');
  expect(await stored(page)).toBeNull();
});

test('a broken record opens a fresh campaign without an error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('prestes.locale', 'en');
    localStorage.setItem('prestes.campaign.v1', '{broken');
  });
  await page.goto('/');
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await expect(page.getByTestId('campaign-seal-prologue-18-do-forte')).toHaveAttribute('data-state', 'open');
  await expect(page.getByTestId('campaign-seal-anel-de-ferro')).toHaveAttribute('data-state', 'locked');
  expect(errors).toEqual([]);
});
