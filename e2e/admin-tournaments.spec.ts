import { test, expect } from './fixtures';

test.describe('Admin Tournament Management', () => {
  test('should display tournament list', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForLoadState('networkidle');

    await expect(adminPage.getByText('Tournament Management')).toBeVisible();
    // Should have stat cards
    await expect(adminPage.getByText('Draft')).toBeVisible();
  });

  test('should open create tournament dialog', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForLoadState('networkidle');

    await adminPage.getByRole('button', { name: /Create Tournament/i }).click();
    await expect(adminPage.getByText('New Tournament')).toBeVisible();
    await expect(adminPage.getByLabel(/Tournament Name/i)).toBeVisible();
    await expect(adminPage.getByLabel(/Venue/i)).toBeVisible();
  });

  test('should filter tournaments', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForLoadState('networkidle');

    // Search bar should be accessible
    const searchInput = adminPage.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('TKD');
  });
});
