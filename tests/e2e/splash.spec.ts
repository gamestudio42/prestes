import { expect, test, type Page } from '@playwright/test';

// prepare-online-release 1.2-1.4: the opening splash, the content warning after
// it, the unsupported-browser message, and the splash on a narrow screen.

const muted = (locale: 'en' | 'pt-BR' | null) => (page: Page) =>
  page.addInitScript((stored) => {
    if (stored) window.localStorage.setItem('prestes.locale', stored);
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true }));
  }, locale);

test.describe('first visit', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the splash shows, leaves once the desk is drawn, and the warning comes after it', async ({ page }) => {
    await muted('en')(page);
    // Record when each one is first seen, from the first byte on.
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __seen: string[] }).__seen = seen;
      const look = () => {
        const splash = document.getElementById('splash');
        if (splash && !splash.classList.contains('splash-done') && !seen.includes('splash')) seen.push('splash');
        if (!splash && !seen.includes('splash-gone')) seen.push('splash-gone');
        if (document.querySelector('[data-testid="content-warning"]') && !seen.includes('warning')) seen.push('warning');
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    await page.goto('/');
    await expect(page.getByTestId('content-warning')).toBeVisible();
    await expect(page.getByTestId('splash')).toHaveCount(0);
    const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
    expect(seen.indexOf('splash-gone')).toBeLessThan(seen.indexOf('warning'));
  });

  test('a Portuguese browser reads the splash in Portuguese', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'pt-BR', storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    // Block the app's script, so the splash can be read before the desk replaces it.
    await page.route(/\/src\/main\.tsx/, (route) => route.abort());
    await page.goto('/');
    await expect(page.getByTestId('splash')).toContainText('A Coluna Prestes');
    await expect(page.getByTestId('splash')).toContainText('Carregando o acampamento');
    await expect(page.getByTestId('splash')).toContainText('Dramatizado');
    await context.close();
  });
});

test('a returning visit goes straight to the desk, with no warning', async ({ page }) => {
  await muted('en')(page);
  await page.goto('/');
  await expect(page.getByTestId('menu-desk')).toBeVisible();
  await expect(page.getByTestId('splash')).toHaveCount(0);
  await expect(page.getByTestId('content-warning')).toHaveCount(0);
});

for (const [locale, text] of [
  ['en', 'It lacks WebGL 2'],
  ['pt-BR', 'Falta o WebGL 2'],
] as const) {
  test(`without WebGL 2 the splash says so (${locale}) and the game does not start`, async ({ page }) => {
    await muted(locale)(page);
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) {
        if (kind === 'webgl2') return null;
        return (original as (...args: unknown[]) => unknown).call(this, kind, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByTestId('splash-unsupported')).toBeVisible();
    await expect(page.getByTestId('splash-unsupported')).toContainText(text);
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('menu-desk')).toHaveCount(0);
    await expect(page.getByTestId('splash')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('the splash fits a 360 px wide screen', async ({ page }) => {
  await muted('pt-BR')(page);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.route(/\/src\/main\.tsx/, (route) => route.abort());
  await page.goto('/');
  await expect(page.getByTestId('splash')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  // The unsupported message, the widest state, fits too.
  await page.evaluate(() => document.getElementById('splash')!.classList.add('splash-unsupported-shown'));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(wide).toBe(0);
});
