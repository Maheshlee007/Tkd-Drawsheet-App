import { test as base, expect, type Page } from '@playwright/test';

export { expect };

export const ADMIN = {
  email: 'admin@tkd.local',
  password: 'TkdAdmin@2026',
};

export const ORGANIZER = {
  email: 'organizer@tkd.local',
  password: 'Test@1234',
};

async function loginAs(page: Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('#username', creds.email);
  await page.fill('#password', creds.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('/', { timeout: 15_000 });
}

export const test = base.extend<{
  adminPage: Page;
  organizerPage: Page;
}>({
  adminPage: async ({ page }, use) => {
    await loginAs(page, ADMIN);
    await use(page);
  },
  organizerPage: async ({ page }, use) => {
    await loginAs(page, ORGANIZER);
    await use(page);
  },
});
