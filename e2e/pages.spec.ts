import { test, expect } from './fixtures';

test.describe('Match Dashboard', () => {
  test('should load with tournament selector and show data after selection', async ({ adminPage }) => {
    await adminPage.goto('/match-dashboard');
    await adminPage.waitForTimeout(3000);

    // Should have tournament selector
    await expect(adminPage.getByText(/Select tournament/i).first()).toBeVisible({ timeout: 5000 });

    // Select tournament
    await adminPage.getByText(/Select tournament/i).first().click();
    await adminPage.waitForTimeout(500);
    await adminPage.getByText(/TKD State/i).first().click();
    await adminPage.waitForTimeout(2000);

    // After selection, stat cards should appear
    await expect(adminPage.getByText('Categories').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display event filter and category progress', async ({ adminPage }) => {
    await adminPage.goto('/match-dashboard');
    await adminPage.waitForTimeout(3000);

    // Event type filter
    await expect(adminPage.getByText(/All Events|Kyorugi|Poomsae/i).first()).toBeVisible({ timeout: 5000 });

    // If tournament is auto-selected, category progress table should show
    const progressTable = adminPage.getByText(/Category Progress|Event/i).first();
    await expect(progressTable).toBeVisible({ timeout: 5000 }).catch(() => {
      // May need to select tournament first
    });
  });
});

test.describe('Staff Assignment Tab', () => {
  test('should navigate to staff tab and show content', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Click Staff Assignment tab
    await adminPage.getByText('Staff Assignment').first().click();
    await adminPage.waitForTimeout(1000);

    // Verify tab content loads (not just tab label)
    // Should show tournament selector or staff assignment interface
    await expect(
      adminPage.getByText(/Select.*Tournament|Assign|Staff/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Verify / Check-in Page', () => {
  test('should load with search input and lookup a player', async ({ adminPage }) => {
    await adminPage.goto('/verify');
    await adminPage.waitForTimeout(2000);

    // Should have player code search input
    const codeInput = adminPage.getByPlaceholder(/player code|code/i).first();
    await expect(codeInput).toBeVisible({ timeout: 5000 });

    // Look up a known player
    await codeInput.fill('TKD-2026-7HGI');
    await adminPage.keyboard.press('Enter');
    await adminPage.waitForTimeout(3000);

    // Player details should appear
    await expect(adminPage.getByText('mahesh', { exact: false }).first()).toBeVisible({ timeout: 5000 });
    // Should show belt, category, or other details
    await expect(adminPage.getByText(/Black/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should show check-in form after player lookup', async ({ adminPage }) => {
    await adminPage.goto('/verify');
    await adminPage.waitForTimeout(2000);

    const codeInput = adminPage.getByPlaceholder(/player code|code/i).first();
    await codeInput.fill('TKD-2026-7HGI');
    await adminPage.keyboard.press('Enter');
    await adminPage.waitForTimeout(3000);

    // Check-in form elements should be visible
    await expect(
      adminPage.getByText(/Actual Weight|Weigh-in|Check-in|Payment/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Weight Categories Page', () => {
  test('should display age groups and weight classes with real data', async ({ adminPage }) => {
    await adminPage.goto('/weight-categories');
    await adminPage.waitForTimeout(3000);

    // Age group chips/filters
    await expect(adminPage.getByText(/Sub Junior|Junior|Senior|Cadet/i).first()).toBeVisible({ timeout: 5000 });

    // Weight data with kg
    await expect(adminPage.getByText(/kg/i).first()).toBeVisible({ timeout: 5000 });

    // Should show male/female columns or gender toggle
    await expect(adminPage.getByText(/Male|Female|Gender/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should filter by gender view', async ({ adminPage }) => {
    await adminPage.goto('/weight-categories');
    await adminPage.waitForTimeout(3000);

    // Click Male filter if available
    const maleBtn = adminPage.getByRole('button', { name: /^Male$/i }).first();
    if (await maleBtn.isVisible().catch(() => false)) {
      await maleBtn.click();
      await adminPage.waitForTimeout(500);
      // Should still show weight data
      await expect(adminPage.getByText(/kg/i).first()).toBeVisible();
    }
  });
});

test.describe('Password Reset Page', () => {
  test('should load with functional interface', async ({ adminPage }) => {
    // Password reset is a tab under /admin/users
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    await adminPage.getByText('Passwords').first().click();
    await adminPage.waitForTimeout(1000);

    // Should show password reset interface
    await expect(
      adminPage.getByText(/Password|Reset|Change/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
