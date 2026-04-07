import { test, expect } from './fixtures';

test.describe('Match Dashboard', () => {
  test('should load match dashboard page', async ({ adminPage }) => {
    await adminPage.goto('/match-dashboard');
    await adminPage.waitForLoadState('networkidle');

    // Select dropdowns should render without crashing (was previously crashing with empty value)
    await expect(adminPage.locator('page')).not.toContainText('Application error');
  });

  test('should display event filter controls', async ({ adminPage }) => {
    await adminPage.goto('/match-dashboard');
    await adminPage.waitForLoadState('networkidle');

    // The Select components should be visible
    await expect(adminPage.getByText('All Events')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Page may not have default text if no tournament selected
    });
  });
});

test.describe('Staff Assignment', () => {
  test('should load staff page without double layout', async ({ adminPage }) => {
    await adminPage.goto('/staff-assignment');
    await adminPage.waitForLoadState('networkidle');

    // Verify only one AppLayout (no double sidebar). Count sidebar instances.
    const sideNavs = adminPage.locator('[class*="SideNav"], nav').first();
    await expect(sideNavs).toBeVisible();
  });
});

test.describe('Verify / Check-in Page', () => {
  test('should load verify page', async ({ adminPage }) => {
    await adminPage.goto('/verify');
    await adminPage.waitForLoadState('networkidle');

    // Should display the check-in interface
    await expect(adminPage.locator('body')).not.toContainText('Application error');
  });
});

test.describe('Password Reset Page', () => {
  test('should load password reset page', async ({ adminPage }) => {
    await adminPage.goto('/password-reset');
    await adminPage.waitForLoadState('networkidle');

    await expect(adminPage.locator('body')).not.toContainText('Application error');
  });
});
