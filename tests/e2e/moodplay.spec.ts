import { expect, test } from '@playwright/test';

test('karşılama ekranı izin vermeden kamerayı açmaz', async ({ page }) => {
  await page.addInitScript(() => {
    const calls: string[] = [];
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: (constraints: MediaStreamConstraints) => {
          calls.push(JSON.stringify(constraints));
          return Promise.reject(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
        },
        enumerateDevices: () => Promise.resolve([]),
      },
    });
    (window as unknown as { __moodplayCalls: string[] }).__moodplayCalls = calls;
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Yüz ifaden müziğini seçsin' })).toBeVisible();
  await expect(page.getByTestId('debug-panel')).toHaveCount(0);
  const before = await page.evaluate(() => (window as unknown as { __moodplayCalls: string[] }).__moodplayCalls.length);
  expect(before).toBe(0);

  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('error-banner')).toContainText('Kamera izni verilmedi');
  const calls = await page.evaluate(() => (window as unknown as { __moodplayCalls: string[] }).__moodplayCalls);
  expect(calls.length).toBeGreaterThan(0);
  expect(calls[0]).toContain('"audio":false');
});

test('ayarlar yenilemeden sonra durur ve debug kapalı kalır', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('settings-button').click();
  await page.getByTestId('messages-happy').fill('Festival gülümsemesi\nİkinci satır\nÜçüncü satır');
  await page.getByRole('button', { name: 'Kapat' }).click();
  await page.reload();
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('messages-happy')).toHaveValue(/Festival gülümsemesi/);
  await page.getByRole('button', { name: 'Kapat' }).click();
  await expect(page.getByTestId('debug-panel')).toHaveCount(0);
});

test('sahte test kamerası yüz bulamayınca gülümseme uydurmaz', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('camera-video')).toBeVisible();
  await expect(page.getByTestId('expression-card')).toContainText('Yüz görünmüyor', { timeout: 45_000 });
  await expect(page.getByTestId('expression-card')).not.toContainText('%');
  await expect(page.getByTestId('expression-card')).not.toContainText('Gülümseme');
  await page.getByTestId('settings-button').click();
  await page.getByLabel('Geliştirici panelini göster').check();
  await page.getByTestId('settings-panel').getByRole('button', { name: 'Kapat', exact: true }).click();
  await expect(page.getByTestId('perf-inference')).not.toContainText('ölçülmedi', { timeout: 10_000 });
  const inference = await page.getByTestId('perf-inference').innerText();
  const fps = await page.getByTestId('perf-fps').innerText();
  console.log(`MoodPlay perf: ${inference} | ${fps}`);
  await expect(page.locator('footer')).toContainText('Ziyaretçi 2');
  await page.getByTestId('new-visitor').click();
  await expect(page.locator('footer')).toContainText('Ziyaretçi 3');
  await page.getByTestId('fullscreen-button').click();
  await expect(
    page.getByRole('button', { name: 'Tam ekrandan çık' }).or(page.getByText('Tarayıcı tam ekran isteğini reddetti.')).or(page.getByText('Bu tarayıcı tam ekranı desteklemiyor.')),
  ).toBeVisible();
  await page.getByTestId('stop-button').click();
  await expect(page.getByTestId('welcome-screen')).toBeVisible();
  await expect(page.getByText('Deneyim durduruldu. Kamera kapatıldı.')).toBeVisible();
});

test('dar ve geniş ekranda yatay taşma olmaz', async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows).toBe(false);
  }
});
