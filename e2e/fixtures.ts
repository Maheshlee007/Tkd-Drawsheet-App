import { test as base, type Page } from '@playwright/test';

/** Test credentials */
export const ADMIN = { email: 'admin@tkd.local', password: 'TkdAdmin@2026' };
export const ORGANIZER = { email: 'organizer@tkd.local', password: 'Test@1234' };
export const JURY = { email: 'jury1@tkd.local', password: 'Test@1234' };
export const VERIFY = { email: 'verify@tkd.local', password: 'Test@1234' };
export const COACH = { email: 'coach1@tkd.local', password: 'Test@1234' };

const API_BASE = process.env.API_URL ?? 'http://localhost:5000';

/** Login via API and inject tokens into localStorage */
export async function loginViaAPI(page: Page, email: string, password: string): Promise<void> {
  const response = await page.request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Login failed for ${email}: ${response.status()} — ${body}`);
  }

  const json = await response.json();
  const { accessToken, refreshToken, user } = json.data;

  // Inject tokens into localStorage before navigating
  await page.addInitScript(({ accessToken, refreshToken, user }) => {
    localStorage.setItem('tkd-access-token', accessToken);
    localStorage.setItem('tkd-refresh-token', refreshToken);
    localStorage.setItem('tournament-auth', JSON.stringify({
      state: {
        user,
        sessionId: crypto.randomUUID(),
        activeRole: null,
      },
      version: 0,
    }));
  }, { accessToken, refreshToken, user });
}

/** Extended test fixture with pre-authenticated pages */
export const test = base.extend<{
  adminPage: Page;
  organizerPage: Page;
}>({
  adminPage: async ({ page }, use) => {
    await loginViaAPI(page, ADMIN.email, ADMIN.password);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await use(page);
  },
  organizerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginViaAPI(page, ORGANIZER.email, ORGANIZER.password);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
