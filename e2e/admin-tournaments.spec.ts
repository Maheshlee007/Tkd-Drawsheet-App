import { test, expect } from './fixtures';

test.describe('Admin Tournament Management', () => {
  test('should display tournament list with real data', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForTimeout(2000);

    await expect(adminPage.getByText('Tournament Management').first()).toBeVisible();
    // Stat cards with real counts
    await expect(adminPage.getByText('Registration Open').first()).toBeVisible();
    // Tournament table with real tournament
    await expect(adminPage.getByText('TKD-2026-TEST1').first()).toBeVisible();
    await expect(adminPage.getByText('TKD State Championshi').first()).toBeVisible();
  });

  test('should open tournament detail sheet with real data', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForTimeout(2000);

    // Click the tournament row to open detail sheet
    await adminPage.getByText('TKD-2026-TEST1').first().click();
    await adminPage.waitForTimeout(1000);

    // Verify detail sheet content
    await expect(adminPage.getByText('TKD State Championship 2026').first()).toBeVisible({ timeout: 5000 });
    await expect(adminPage.getByText('Registration Open').first()).toBeVisible();
    // Location
    await expect(adminPage.getByText(/Indoor Stadium/i).first()).toBeVisible();
    await expect(adminPage.getByText(/Chennai/i).first()).toBeVisible();
    // Dates
    await expect(adminPage.getByText(/3\/15\/2026|2026-03-15/i).first()).toBeVisible();
    // Entry fee
    await expect(adminPage.getByText(/500/i).first()).toBeVisible();
    // Stats section
    await expect(adminPage.getByText('Players').first()).toBeVisible();
    await expect(adminPage.getByText('Categories').first()).toBeVisible();
    // Organizer
    await expect(adminPage.getByText('organizer@tkd.local').first()).toBeVisible();
  });

  test('should filter tournaments by search', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForTimeout(2000);

    const searchInput = adminPage.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();

    // Search for existing tournament
    await searchInput.fill('TKD');
    await adminPage.waitForTimeout(500);
    await expect(adminPage.getByText('TKD-2026-TEST1').first()).toBeVisible();

    // Search for non-existent
    await searchInput.fill('ZZZZNONEXISTENT');
    await adminPage.waitForTimeout(500);
    // The tournament should not be visible
    await expect(adminPage.getByText('TKD-2026-TEST1')).not.toBeVisible({ timeout: 2000 });

    // Clear and verify original list returns
    await searchInput.clear();
    await adminPage.waitForTimeout(500);
    await expect(adminPage.getByText('TKD-2026-TEST1').first()).toBeVisible();
  });

  test('should open create tournament dialog with all fields', async ({ adminPage }) => {
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForTimeout(2000);

    await adminPage.getByRole('main').getByRole('button', { name: /Create Tournament/i }).click();
    await adminPage.waitForTimeout(500);

    // Verify dialog fields
    await expect(adminPage.getByText('Tournament Name *')).toBeVisible();
    await expect(adminPage.getByPlaceholder(/State Championship/i)).toBeVisible();
    await expect(adminPage.getByText('Start Date *')).toBeVisible();
    await expect(adminPage.getByText('End Date *')).toBeVisible();
    // Venue/City fields
    await expect(adminPage.getByText('Venue').first()).toBeVisible();
    await expect(adminPage.getByText('City').first()).toBeVisible();
  });
});
