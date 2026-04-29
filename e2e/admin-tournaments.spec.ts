import { test, expect } from './fixtures';

test.describe('Admin Tournament Management', () => {
  test('should display tournament list', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForTimeout(2000);

    await expect(adminPage.getByText('Tournament Management').first()).toBeVisible();
    // Should have stat cards
    await expect(adminPage.getByText('Draft').first()).toBeVisible();
  });

  test('should open create tournament dialog', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForTimeout(2000);

    await adminPage.getByRole('main').getByRole('button', { name: /Create Tournament/i }).click();
    await adminPage.waitForTimeout(500);
    await expect(adminPage.getByText(/New Tournament|Create Tournament/i).first()).toBeVisible();
    await expect(adminPage.getByText('Tournament Name *')).toBeVisible();
    await expect(adminPage.getByPlaceholder(/State Championship/i)).toBeVisible();
  });

  test('should filter tournaments', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForTimeout(2000);

    // Search bar should be accessible
    const searchInput = adminPage.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('TKD');
  });
});
