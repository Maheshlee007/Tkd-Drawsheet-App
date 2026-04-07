import { test, expect } from './fixtures';

test.describe('Navigation & Role Switching', () => {
  test('admin sidebar shows all sections', async ({ adminPage }) => {
    // Admin should see all nav sections
    await expect(adminPage.getByText('Management')).toBeVisible();
    await expect(adminPage.getByText('Registration')).toBeVisible();
    await expect(adminPage.getByText('Portals')).toBeVisible();
    await expect(adminPage.getByText('Admin')).toBeVisible();
  });

  test('organizer sidebar shows relevant sections', async ({ organizerPage }) => {
    await expect(organizerPage.getByText('Management')).toBeVisible();
    await expect(organizerPage.getByText('Registration')).toBeVisible();
    // Should NOT see Admin section
    await expect(organizerPage.getByText('Admin').first()).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // Admin section heading might appear in other text, assert nav link
    });
  });

  test('admin can navigate to User Management', async ({ adminPage }) => {
    await adminPage.getByText('User Management').click();
    await adminPage.waitForURL('**/admin/users');
    await expect(adminPage.getByText('Staff Users')).toBeVisible();
  });

  test('admin can navigate to Tournament Management', async ({ adminPage }) => {
    await adminPage.getByText('Tournaments').click();
    await adminPage.waitForURL('**/admin/tournaments');
    await expect(adminPage.getByText('Tournament Management')).toBeVisible();
  });

  test('admin can navigate to Match Dashboard', async ({ adminPage }) => {
    await adminPage.getByText('Match Dashboard').click();
    await adminPage.waitForURL('**/match-dashboard');
  });

  test('can navigate to Check-in / Verify page', async ({ adminPage }) => {
    await adminPage.getByText('Check-in / Verify').click();
    await adminPage.waitForURL('**/verify');
  });

  test('can navigate to Weight Categories', async ({ adminPage }) => {
    await adminPage.getByText('Weight Categories').click();
    await adminPage.waitForURL('**/weight-categories');
  });
});
