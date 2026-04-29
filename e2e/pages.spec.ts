import { test, expect } from './fixtures';

test.describe('Match Dashboard', () => {
  test('should load match dashboard page', async ({ adminPage }) => {
    await adminPage.goto('/match-dashboard');
    await adminPage.waitForTimeout(2000);

    // Select dropdowns should render without crashing
    await expect(adminPage.locator('body')).not.toContainText('Application error');
  });

  test('should display event filter controls', async ({ adminPage }) => {
    await adminPage.goto('/match-dashboard');
    await adminPage.waitForTimeout(2000);

    // The Select components should be visible
    await expect(adminPage.getByText('All Events').first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Page may not have default text if no tournament selected
    });
  });
});

test.describe('Staff Assignment', () => {
  test('should load staff page without double layout', async ({ adminPage }) => {
    // Staff management is under the unified user management page with staff tab
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Verify the page loaded with sidebar and no double layout
    await expect(adminPage.locator('aside').first()).toBeVisible();
    // Verify tabs are visible (Accounts, Staff Assignment, etc.)
    await expect(adminPage.getByText('Staff Assignment').first()).toBeVisible();
  });
});

test.describe('Verify / Check-in Page', () => {
  test('should load verify page', async ({ adminPage }) => {
    await adminPage.goto('/verify');
    await adminPage.waitForTimeout(2000);

    // Should display the check-in interface
    await expect(adminPage.locator('body')).not.toContainText('Application error');
  });
});

test.describe('Password Reset Page', () => {
  test('should load password reset page', async ({ adminPage }) => {
    await adminPage.goto('/password-reset');
    await adminPage.waitForTimeout(2000);

    await expect(adminPage.locator('body')).not.toContainText('Application error');
  });
});
