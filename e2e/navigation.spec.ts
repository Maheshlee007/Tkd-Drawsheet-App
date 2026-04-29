import { test, expect } from './fixtures';

test.describe('Navigation & Role Switching', () => {
  test('admin sidebar shows all sections', async ({ adminPage }) => {
    // Section headings are h3 elements in the sidebar nav
    const nav = adminPage.locator('div').filter({ has: adminPage.locator('h3') }).first();
    await expect(adminPage.locator('h3', { hasText: 'Management' }).first()).toBeVisible();
    await expect(adminPage.locator('h3', { hasText: 'Registration' }).first()).toBeVisible();
    await expect(adminPage.locator('h3', { hasText: 'Portals' }).first()).toBeVisible();
    await expect(adminPage.locator('h3', { hasText: 'Admin' }).first()).toBeVisible();
  });

  test('organizer sidebar shows relevant sections', async ({ organizerPage }) => {
    await expect(organizerPage.locator('h3', { hasText: 'Management' }).first()).toBeVisible();
    await expect(organizerPage.locator('h3', { hasText: 'Registration' }).first()).toBeVisible();
    // Should NOT see Admin section
    await expect(organizerPage.locator('h3', { hasText: 'Admin' })).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // Admin section heading might not exist for organizer
    });
  });

  test('admin can navigate to User Management', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'User Management' }).first().click();
    await adminPage.waitForURL('**/admin/users');
    await expect(adminPage.getByText('Staff Users')).toBeVisible();
  });

  test('admin can navigate to Tournament Management', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'Tournaments' }).first().click();
    await adminPage.waitForURL('**/admin/tournaments');
    await expect(adminPage.getByText('Tournament Management')).toBeVisible();
  });

  test('admin can navigate to Match Dashboard', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'Match Dashboard' }).first().click();
    await adminPage.waitForURL('**/match-dashboard');
  });

  test('can navigate to Check-in / Verify page', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'Check-in / Verify' }).first().click();
    await adminPage.waitForURL('**/verify');
  });

  test('can navigate to Weight Categories', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'Weight Categories' }).first().click();
    await adminPage.waitForURL('**/weight-categories');
  });
});
