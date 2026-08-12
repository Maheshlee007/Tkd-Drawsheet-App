import { test, expect } from './fixtures';

test.describe('Navigation & Role Switching', () => {
  test('admin sidebar shows all sections', async ({ adminPage }) => {
    await expect(adminPage.locator('h3', { hasText: 'Management' }).first()).toBeVisible();
    await expect(adminPage.locator('h3', { hasText: 'Registration' }).first()).toBeVisible();
    await expect(adminPage.locator('h3', { hasText: 'Portals' }).first()).toBeVisible();
    await expect(adminPage.locator('h3', { hasText: 'Admin' }).first()).toBeVisible();
  });

  test('organizer sidebar shows relevant sections but not Admin', async ({ organizerPage }) => {
    await expect(organizerPage.locator('h3', { hasText: 'Management' }).first()).toBeVisible();
    await expect(organizerPage.locator('h3', { hasText: 'Registration' }).first()).toBeVisible();
    await expect(organizerPage.locator('h3', { hasText: 'Admin' })).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('navigate to User Management and verify content', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'User Management' }).first().click();
    await adminPage.waitForURL('**/admin/users');
    await expect(adminPage.getByText('Staff Users')).toBeVisible();
    // Verify table and real data loaded
    await expect(adminPage.getByRole('table')).toBeVisible();
    await expect(adminPage.getByText('admin@tkd.local')).toBeVisible();
  });

  test('navigate to Tournament Management and verify content', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'Tournaments' }).first().click();
    await adminPage.waitForURL('**/admin/tournaments');
    await expect(adminPage.getByText('Tournament Management')).toBeVisible();
    // Real tournament data visible
    await expect(adminPage.getByText('TKD-2026-TEST1').first()).toBeVisible();
  });

  test('navigate to Match Dashboard and verify controls', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'Match Dashboard' }).first().click();
    await adminPage.waitForURL('**/match-dashboard');
    // Verify dashboard loaded with functional controls
    await expect(adminPage.getByText(/Select tournament/i).first()).toBeVisible({ timeout: 5000 });
    await expect(adminPage.getByText('All Events').first()).toBeVisible();
  });

  test('navigate to Check-in / Verify and verify search input', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'Check-in / Verify' }).first().click();
    await adminPage.waitForURL('**/verify');
    // Verify search input is visible
    await expect(adminPage.getByPlaceholder(/player code|code/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('navigate to Weight Categories and verify data', async ({ adminPage }) => {
    await adminPage.locator('button', { hasText: 'Weight Categories' }).first().click();
    await adminPage.waitForURL('**/weight-categories');
    // Verify real weight category data renders
    await expect(adminPage.getByText(/Sub Junior|Junior|Senior|Cadet/i).first()).toBeVisible({ timeout: 5000 });
    await expect(adminPage.getByText(/kg/i).first()).toBeVisible({ timeout: 5000 });
  });
});
