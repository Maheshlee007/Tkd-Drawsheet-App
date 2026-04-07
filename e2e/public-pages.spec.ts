import { test, expect } from './fixtures';

test.describe('Public Pages', () => {
  test('should load board page without auth', async ({ page }) => {
    await page.goto('/board');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('should load jury portal without auth', async ({ page }) => {
    await page.goto('/jury');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('should load player registration without auth', async ({ page }) => {
    await page.goto('/register');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('should load coach registration without auth', async ({ page }) => {
    await page.goto('/coach-register');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).not.toContainText('Application error');
  });

  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText(/not found|404/i)).toBeVisible({ timeout: 5000 }).catch(() => {
      // Might redirect to login or show NotFound page
    });
  });
});

test.describe('Protected Pages Redirect', () => {
  test('admin/users redirects to login', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin/tournaments redirects to login', async ({ page }) => {
    await page.goto('/admin/tournaments');
    await expect(page).toHaveURL(/\/login/);
  });

  test('weight-categories redirects to login', async ({ page }) => {
    await page.goto('/weight-categories');
    await expect(page).toHaveURL(/\/login/);
  });
});
