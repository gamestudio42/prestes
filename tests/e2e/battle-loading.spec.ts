import { expect, test, type Page } from '@playwright/test';

// prepare-online-release 2.3-2.4: a battle waits on the loading screen for
// its files, opens directly on a warm cache, survives a missing file, and
// plays the same with or without the wait.

type Bridge = { __prestes?: { step: (ticks: number) => void; frame: () => { tick: number; hash: string } | null } };

async function openDesk(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
  });
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
}

/** Watches the loading screen from the page: whether it showed, and every progress value it gave. */
async function watchLoading(page: Page) {
  await page.evaluate(() => {
    const host = window as unknown as { __loading: { shown: boolean; done: number[]; total: number; hudFirst: boolean } };
    host.__loading = { shown: false, done: [], total: 0, hudFirst: false };
    const look = () => {
      const screen = document.querySelector<HTMLElement>('[data-testid="battle-loading"]');
      if (screen) {
        host.__loading.shown = true;
        const done = Number(screen.dataset.done);
        if (host.__loading.done.at(-1) !== done) host.__loading.done.push(done);
        host.__loading.total = Number(screen.dataset.total);
        if (document.querySelector('[data-testid="hud"]')) host.__loading.hudFirst = true;
      }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
}
const loadingSeen = (page: Page) =>
  page.evaluate(() => (window as unknown as { __loading: { shown: boolean; done: number[]; total: number; hudFirst: boolean } }).__loading);

async function startSkirmish(page: Page) {
  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
}

const hashAfter = async (page: Page, ticks: number) => {
  // Time runs once deployment ends.
  await page.getByTestId('start-battle').click();
  await expect(page.getByTestId('deployment-banner')).toHaveCount(0);
  await page.evaluate((count) => (window as unknown as Bridge).__prestes!.step(count), ticks);
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()?.tick ?? -1)).toBeGreaterThanOrEqual(ticks);
  return page.evaluate(() => (window as unknown as Bridge).__prestes!.frame()!.hash);
};

test('a cold start waits on the loading screen, with rising progress, then opens in deployment', async ({ page }) => {
  const pending = new Set<string>();
  let openWhileLoading = 0;
  await page.route(/\.glb(\?|$)/, async (route) => {
    pending.add(route.request().url());
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  page.on('requestfinished', (request) => pending.delete(request.url()));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openDesk(page);
  await watchLoading(page);
  await startSkirmish(page);
  await expect(page.getByTestId('battle-loading')).toBeVisible();
  await expect(page.getByTestId('battle-loading')).toContainText('Skirmish');
  await expect(page.getByTestId('hud')).toBeVisible({ timeout: 30_000 });
  openWhileLoading = pending.size;
  await expect(page.getByTestId('deployment-banner')).toBeVisible();
  await expect(page.getByTestId('battle-loading')).toHaveCount(0);
  const seen = await loadingSeen(page);
  expect(seen.shown).toBe(true);
  expect(seen.hudFirst).toBe(false);
  expect(seen.done.length).toBeGreaterThan(2);
  expect([...seen.done].sort((a, b) => a - b)).toEqual(seen.done);
  // Every model file was in before the battle opened: no stand-in swapped in view.
  expect(openWhileLoading).toBe(0);
  expect(errors).toEqual([]);
});

test('a warm start opens without the screen, and plays the same as the cold one', async ({ page }) => {
  await page.route(/\.glb(\?|$)/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await openDesk(page);
  await startSkirmish(page);
  await expect(page.getByTestId('deployment-banner')).toBeVisible({ timeout: 30_000 });
  const cold = await hashAfter(page, 40);

  await page.getByTestId('hud-menu').click();
  await page.getByTestId('leave-battle').click();
  await page.getByTestId('leave-confirm').click();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await watchLoading(page);
  await startSkirmish(page);
  await expect(page.getByTestId('deployment-banner')).toBeVisible();
  expect((await loadingSeen(page)).shown).toBe(false);
  const warm = await hashAfter(page, 40);
  expect(warm).toBe(cold);
});

test('a file that fails twice opens the battle with stand-ins and a notice', async ({ page }) => {
  let asked = 0;
  await page.route(/props\.glb(\?|$)/, async (route) => {
    asked += 1;
    await route.fulfill({ status: 404, body: 'missing' });
  });
  await openDesk(page);
  await startSkirmish(page);
  await expect(page.getByTestId('deployment-banner')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('asset-notice')).toBeVisible();
  await expect(page.getByTestId('asset-notice')).toContainText('could not be loaded');
  expect(asked).toBeGreaterThanOrEqual(2);
  await page.getByTestId('asset-notice-close').click();
  await expect(page.getByTestId('asset-notice')).toHaveCount(0);
});
