/**
 * Jury portal flow — the previously untested path:
 * admin creates jury + category assignment (via API), jury logs in at /jury
 * with just the code, sees "My Categories", and has working chrome (logout).
 *
 * Requires backend on :5000 with seeded data (TKD-2026-TEST1, admin account).
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:5000';
const ADMIN = { email: 'admin@tkd.local', password: 'TkdAdmin@2026' };
const TOURNAMENT_CODE = 'TKD-2026-TEST1';

let juryCode = '';
let assignmentId = '';
let adminToken = '';

test.beforeAll(async ({ request }) => {
  const login = await request.post(`${API}/api/auth/login`, { data: ADMIN });
  expect(login.ok()).toBeTruthy();
  adminToken = (await login.json()).data.accessToken;
  const headers = { Authorization: `Bearer ${adminToken}` };

  const tRes = await request.get(`${API}/api/tournaments/code/${TOURNAMENT_CODE}`);
  const tournament = (await tRes.json()).data;

  const cRes = await request.get(`${API}/api/tournaments/${tournament.id}/categories`);
  const category = (await cRes.json()).data[0];
  expect(category, 'test tournament must have at least one category').toBeTruthy();

  const jRes = await request.post(`${API}/api/judges/create`, {
    headers,
    data: { firstName: 'E2E', lastName: 'Jury', tournamentId: tournament.id },
  });
  const jury = (await jRes.json()).data;
  juryCode = jury.juryCode;
  expect(juryCode).toMatch(/^JURY-/);

  const aRes = await request.post(`${API}/api/judges/assign`, {
    headers,
    data: { judgeId: jury.userId, categoryId: category.id, tournamentId: tournament.id },
  });
  assignmentId = (await aRes.json()).data?.id ?? '';
});

test.afterAll(async ({ request }) => {
  if (assignmentId) {
    await request.delete(`${API}/api/judges/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }
});

test.describe('Jury Portal', () => {
  test('login with jury code shows assigned categories and chrome', async ({ page }) => {
    await page.goto('/jury');

    // Login card
    await expect(page.getByText('Enter your jury code to access assigned matches')).toBeVisible();
    await page.getByPlaceholder('JURY-XXXXXX').fill(juryCode);
    await page.getByRole('button', { name: /Sign In with Jury Code/i }).click();

    // Portal chrome after login
    await expect(page.getByText('Jury Portal').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /logout/i })).toBeVisible();

    // The assigned category surfaces in "My Categories"
    await expect(page.getByText(/My Categories/i).first()).toBeVisible({ timeout: 15000 });

    // Logout returns to the code-entry card
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page.getByPlaceholder('JURY-XXXXXX')).toBeVisible({ timeout: 10000 });
  });

  test('rejects an invalid jury code', async ({ page }) => {
    await page.goto('/jury');
    await page.getByPlaceholder('JURY-XXXXXX').fill('JURY-ZZZZZZ');
    await page.getByRole('button', { name: /Sign In with Jury Code/i }).click();
    await expect(page.getByText(/invalid jury code/i)).toBeVisible({ timeout: 10000 });
  });
});
