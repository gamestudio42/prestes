import { expect, test, type Page, type TestInfo } from '@playwright/test';

// prepare-online-release 4.2 (D7): the built game, as published, on a slow
// broadband connection: about 1.5 MB/s down, 150 ms latency, no cache. Runs
// in the `release` project against `vite preview` of apps/game/dist.

const THROTTLE = { offline: false, latency: 150, downloadThroughput: 1_500_000, uploadThroughput: 750_000 };

test.describe.configure({ timeout: 240_000 });

async function throttle(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', THROTTLE);
}

/** Records, from the first byte, the order in which the splash, desk, loading screen and HUD first show. */
async function watch(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
    const start = performance.now();
    const seen: { name: string; at: number }[] = [];
    const done: number[] = [];
    const host = window as unknown as { __watch: { seen: typeof seen; done: number[]; total: number } };
    host.__watch = { seen, done, total: 0 };
    const mark = (name: string) => {
      if (!seen.some((entry) => entry.name === name)) seen.push({ name, at: Math.round(performance.now() - start) });
    };
    const look = () => {
      const splash = document.getElementById('splash');
      if (splash && !splash.classList.contains('splash-done')) mark('splash');
      if (document.querySelector('[data-testid="menu-desk"]')) mark('desk');
      if (document.readyState !== 'loading' && !splash) mark('splash-gone');
      const loading = document.querySelector<HTMLElement>('[data-testid="battle-loading"]');
      if (loading) {
        mark('loading');
        const value = Number(loading.dataset.done);
        if (done.at(-1) !== value) done.push(value);
        host.__watch.total = Number(loading.dataset.total);
      }
      if (document.querySelector('[data-testid="hud"]')) mark('hud');
      if (document.querySelector('[data-testid="deployment-banner"]')) mark('deployment');
      requestAnimationFrame(look);
    };
    if (document.readyState === 'loading') document.addEventListener('readystatechange', () => requestAnimationFrame(look), { once: true });
    else requestAnimationFrame(look);
  });
}

const watched = (page: Page) => page.evaluate(() => (window as unknown as { __watch: { seen: { name: string; at: number }[]; done: number[]; total: number } }).__watch);
const order = (seen: { name: string }[], name: string) => seen.findIndex((entry) => entry.name === name);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Every request for a public-folder file carries the build's version (D5). */
function collectUnversioned(page: Page): string[] {
  const unversioned: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (/\/(models|audio|music|maps)\/|\/assets\/(sections|compendium)\//.test(url.pathname) && !url.searchParams.has('v')) unversioned.push(url.pathname);
  });
  return unversioned;
}

async function passWarning(page: Page): Promise<void> {
  await expect(page.getByTestId('content-warning')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('content-warning-continue').click();
  await expect(page.getByTestId('menu-desk')).toBeVisible();
}

async function expectBattleOpened(page: Page, testInfo: TestInfo, label: string): Promise<void> {
  await expect(page.getByTestId('battle-loading')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('deployment-banner')).toBeVisible({ timeout: 180_000 });
  const run = await watched(page);
  expect(run.done.length).toBeGreaterThan(2);
  expect([...run.done].sort((a, b) => a - b)).toEqual(run.done);
  expect(run.done.at(-1)).toBe(run.total);
  expect(order(run.seen, 'loading')).toBeLessThan(order(run.seen, 'hud'));
  const at = (name: string) => run.seen.find((entry) => entry.name === name)?.at ?? -1;
  const times = `${label}: desk at ${at('desk')} ms, loading screen at ${at('loading')} ms, deployment at ${at('deployment')} ms (${run.total} entries)`;
  testInfo.annotations.push({ type: 'cold load', description: times });
  console.log(times);
}

test('the built game loads on a slow connection: splash, desk, loading screen, battle', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  const unversioned = collectUnversioned(page);
  await throttle(page);
  await watch(page);
  await page.goto('/');
  await expect(page.getByTestId('splash')).toBeVisible();
  await passWarning(page);
  const start = await watched(page);
  expect(order(start.seen, 'splash')).toBe(0);
  expect(order(start.seen, 'splash')).toBeLessThan(order(start.seen, 'desk'));

  await page.getByTestId('open-skirmish').click();
  await page.getByTestId('start-battle-3v3').click();
  await expectBattleOpened(page, testInfo, 'skirmish');
  expect(errors).toEqual([]);
  expect(unversioned).toEqual([]);
});

test('a campaign chapter on a cold cache names its chapter and opens in deployment', async ({ page }, testInfo) => {
  const errors = collectErrors(page);
  await throttle(page);
  await watch(page);
  await page.goto('/');
  await passWarning(page);
  await page.getByTestId('menu-mark-campaign').click();
  await page.getByTestId('book-ribbon-contents').click();
  await page.getByTestId('campaign-chapter-prologue-18-do-forte').click();
  const frame = page.getByTestId('campaign-book').locator('.desk-book-frame');
  await frame.focus();
  for (let i = 0; i < 12 && (await page.getByTestId('chapter-briefing').count()) === 0; i += 1) await page.keyboard.press('ArrowRight');
  await page.getByTestId('chapter-play-prologue-18-do-forte').click();
  await expect(page.getByTestId('battle-loading')).toContainText('Chapter 1', { timeout: 30_000 });
  await expectBattleOpened(page, testInfo, 'chapter 1');
  expect(errors).toEqual([]);
});
