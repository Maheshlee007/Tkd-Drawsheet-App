import { test, expect, ADMIN, ORGANIZER } from './fixtures';

test.describe('Authentication', () => {
  test('should show login page for unauthenticated user', async ({ page }) => {
    await page.goto('/');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  });

  test('should login with valid admin credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', ADMIN.email);
    await page.fill('#password', ADMIN.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Should redirect to home dashboard
    await page.waitForURL('/', { timeout: 10_000 });
    await expect(page).toHaveURL('/');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'wrong@email.com');
    await page.fill('#password', 'WrongPassword');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Should show error message
    await expect(page.locator('.bg-red-50, [role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test('should login with organizer credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', ORGANIZER.email);
    await page.fill('#password', ORGANIZER.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await page.waitForURL('/', { timeout: 10_000 });
    await expect(page).toHaveURL('/');
  });

  test('should redirect to requested page after login', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login\?redirect=.*admin/);

    await page.fill('#username', ADMIN.email);
    await page.fill('#password', ADMIN.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await page.waitForURL('**/admin/users', { timeout: 10_000 });
  });

  test('should keep session across page refresh', async ({ adminPage }) => {
    await adminPage.reload();
    await adminPage.waitForLoadState('networkidle');
    // Should still be on the dashboard, not redirected to login
    await expect(adminPage).not.toHaveURL(/\/login/);
  });
});
