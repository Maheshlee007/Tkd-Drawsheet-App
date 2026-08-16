/**
 * Public registration gate + config-driven fees.
 * - A draft tournament's /register/:code shows the blocking "Registration Closed"
 *   card with no way to continue (the historic behavior was a 409 at final submit).
 * - An open tournament (TKD-2026-TEST1, legacy pricing) renders the closes-at
 *   banner and config-driven events with fees after continuing to the form.
 *
 * Requires backend on :5000 with seeded data (TKD-2026-TEST1 registration_open).
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:5000';
const ADMIN = { email: 'admin@tkd.local', password: 'TkdAdmin@2026' };
const OPEN_CODE = 'TKD-2026-TEST1';

let draftCode = '';

test.beforeAll(async ({ request }) => {
  const login = await request.post(`${API}/api/auth/login`, { data: ADMIN });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).data.accessToken;

  // A fresh draft tournament — the gate must block its public registration page
  const tRes = await request.post(`${API}/api/tournaments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name: 'E2E Gate Probe Cup', startDate: '2026-12-01', endDate: '2026-12-02', venue: 'Gate Hall' },
  });
  expect(tRes.status()).toBe(201);
  draftCode = (await tRes.json()).data.tournament_code;
});

test.describe('Registration gate', () => {
  test('draft tournament shows the blocking closed card, no continue', async ({ page }) => {
    await page.goto(`/register/${draftCode}`);
    await page.waitForTimeout(2000);

    await expect(page.getByText('Registration Closed').first()).toBeVisible();
    await expect(page.getByText(/status is 'draft'|not currently open/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue To Form' })).toHaveCount(0);
  });

  test('open tournament shows closes-at banner and config-driven event fees', async ({ page }) => {
    await page.goto(`/register/${OPEN_CODE}`);
    await page.waitForTimeout(2000);

    // Gateway resolves the code; the window banner is driven by registration-config
    await expect(page.getByText(/Registration closes/i).first()).toBeVisible();

    const cont = page.getByRole('button', { name: 'Continue To Form' });
    await expect(cont).toBeEnabled();
    await cont.click();
    await page.waitForTimeout(1000);

    // Events come from the server config (legacy mode → all canonical events, ₹500 first)
    await expect(page.getByText(/Kyorugi/i).first()).toBeVisible();
    await expect(page.getByText(/₹\s*500|Rs\.?\s*500/).first()).toBeVisible();
  });
});
