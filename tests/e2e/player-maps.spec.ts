import { expect, test, type Page } from '@playwright/test';

// player-skirmish-maps: a map the editor keeps in the browser lies on the
// skirmish pile, plays as a skirmish, and is listed in the editor's Open.

interface Bridge {
  __prestesEditor?: { document(): Record<string, unknown>; state(): { id: string } };
}

const ID = 'meu-mapa-e2e';

/** Keeps a map in the editor's browser storage, as an edit or an import does. */
async function keepMap(page: Page): Promise<void> {
  await page.goto('/editor.html');
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as Bridge).__prestesEditor))).toBe(true);
  await page.evaluate(async (id) => {
    const base = (window as unknown as Bridge).__prestesEditor!.document();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('prestes-editor', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('maps');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve) => {
      const transaction = db.transaction('maps', 'readwrite');
      transaction.objectStore('maps').put({ ...base, id, use: 'skirmish', name: { en: 'My Vale', 'pt-BR': 'Meu Vale' } }, id);
      transaction.oncomplete = resolve;
    });
  }, ID);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('prestes.locale', 'en');
    window.localStorage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
  });
  await keepMap(page);
});

test('a kept map lies on the skirmish pile with its print and opens a battle', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId(`skirmish-sheet-${ID}`)).toHaveCount(1);
  await expect(page.locator(`[data-testid="skirmish-print-${ID}"] img`)).toHaveAttribute('src', /^data:image\/png/);
  await page.getByTestId(`select-skirmish-${ID}`).click({ force: true });
  await page.getByTestId('open-skirmish').click();
  await expect(page.getByTestId(`map-option-${ID}`)).toBeVisible();
  await page.getByTestId('start-battle-3v3').click();
  await expect(page.getByTestId('start-battle')).toBeVisible({ timeout: 20_000 });
});

test("the editor's Open lists the kept maps", async ({ page }) => {
  await page.getByTestId('editor-open').click();
  await expect(page.getByTestId(`open-own-map-${ID}`)).toContainText('My Vale');
  await page.getByTestId(`open-own-${ID}`).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as Bridge).__prestesEditor!.state().id)).toBe(ID);
});
