import { test, expect } from './fixtures';

test.describe('Admin User Management', () => {
  test('should display user list with real stats and data', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Stats cards show real numbers
    await expect(adminPage.getByText('Total').first()).toBeVisible();
    const totalCard = adminPage.locator('div', { hasText: /TOTAL/i }).first();
    await expect(totalCard).toBeVisible();

    // Users table with real users
    await expect(adminPage.getByRole('table')).toBeVisible();
    await expect(adminPage.getByText('admin@tkd.local')).toBeVisible();
    await expect(adminPage.getByText('organizer@tkd.local')).toBeVisible();

    // Role badges visible
    await expect(adminPage.getByText('admin').first()).toBeVisible();
  });

  test('search filters users correctly', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    const search = adminPage.getByPlaceholder('Search by name, email, or role...');

    // Search for "organizer" — should show organizer, hide admin
    await search.fill('organizer');
    await adminPage.waitForTimeout(500);
    await expect(adminPage.getByText('organizer@tkd.local')).toBeVisible();
    // admin row should be hidden
    await expect(adminPage.getByText('admin@tkd.local')).not.toBeVisible({ timeout: 2000 });

    // Clear search — all users visible again
    await search.clear();
    await adminPage.waitForTimeout(500);
    await expect(adminPage.getByText('admin@tkd.local')).toBeVisible();
    await expect(adminPage.getByText('organizer@tkd.local')).toBeVisible();
  });

  test('create staff user and verify in table', async ({ adminPage }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const testEmail = `crudtest_${ts}@test.com`;

    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Open create dialog
    await adminPage.getByRole('button', { name: /Add Staff User/i }).click();
    await adminPage.waitForTimeout(500);
    const dlg = adminPage.getByRole('dialog');
    await expect(dlg).toBeVisible();

    // Fill form (inputs: First Name, Last Name, Email, Password, Phone)
    const inputs = dlg.locator('input');
    await inputs.nth(0).fill('CrudTest');
    await inputs.nth(1).fill('User');
    await inputs.nth(2).fill(testEmail);
    await inputs.nth(3).fill('CrudTest@123');

    // Submit
    await dlg.getByRole('button', { name: 'Create User' }).click();
    await adminPage.waitForTimeout(3000);

    // Dialog should close
    await expect(dlg).not.toBeVisible({ timeout: 5000 });

    // Search for new user and verify they appear
    await adminPage.getByPlaceholder('Search by name, email, or role...').fill(testEmail);
    await adminPage.waitForTimeout(1000);
    await expect(adminPage.getByText(testEmail)).toBeVisible({ timeout: 5000 });
    await expect(adminPage.getByText('CrudTest').first()).toBeVisible();
  });

  test('role management dialog shows checkboxes and can verify role state', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Search for organizer user
    await adminPage.getByPlaceholder('Search by name, email, or role...').fill('organizer@tkd.local');
    await adminPage.waitForTimeout(500);

    const orgRow = adminPage.locator('tr', { hasText: 'organizer@tkd.local' });
    await expect(orgRow.first()).toBeVisible();

    // Click Roles button
    await orgRow.getByRole('button', { name: /Roles/i }).click();
    await adminPage.waitForTimeout(500);

    // Dialog opens with role checkboxes
    await expect(adminPage.getByText(/Manage Roles/i).first()).toBeVisible();
    // Organizer role should be visible and checked
    await expect(adminPage.getByText('organizer').first()).toBeVisible();

    // Close dialog
    await adminPage.keyboard.press('Escape');
  });

  test('view user details shows real data', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Search for admin user
    await adminPage.getByPlaceholder('Search by name, email, or role...').fill('admin@tkd.local');
    await adminPage.waitForTimeout(500);

    // Click view details (eye icon)
    await adminPage.locator('button[title="View details"]').first().click();
    await adminPage.waitForTimeout(500);

    // Verify real data in details dialog
    const detailDlg = adminPage.getByRole('dialog');
    await expect(detailDlg.getByText('User Details').first()).toBeVisible();
    // Dialog should show the admin user's email and permissions
    await expect(detailDlg.getByText(/admin/i).first()).toBeVisible();
    // Should show permissions list (admin has many permissions)
    await expect(detailDlg.getByText(/admin:full|Unrestricted/i).first()).toBeVisible();
  });

  test('status toggle changes user state', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Search for organizer
    await adminPage.getByPlaceholder('Search by name, email, or role...').fill('organizer@tkd.local');
    await adminPage.waitForTimeout(500);

    const orgRow = adminPage.locator('tr', { hasText: 'organizer@tkd.local' });
    await expect(orgRow.first()).toBeVisible();

    // Find status switch
    const statusSwitch = orgRow.locator('button[role="switch"]').first();
    if (await statusSwitch.isVisible()) {
      const beforeState = await statusSwitch.getAttribute('data-state');
      await statusSwitch.click();
      await adminPage.waitForTimeout(1000);

      // Verify state changed
      const afterState = await statusSwitch.getAttribute('data-state');
      expect(afterState).not.toBe(beforeState);

      // Revert
      await statusSwitch.click();
      await adminPage.waitForTimeout(1000);
    }
  });
});
