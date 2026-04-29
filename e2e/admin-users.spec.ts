import { test, expect } from './fixtures';

test.describe('Admin User Management', () => {
  test('should display user list with stats', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Stats cards
    await expect(adminPage.getByText('Total').first()).toBeVisible();

    // Users table
    await expect(adminPage.getByText('Staff Users').first()).toBeVisible();
    await expect(adminPage.getByRole('table')).toBeVisible();

    // At least the admin user should be in the table
    await expect(adminPage.getByText('admin@tkd.local')).toBeVisible();
  });

  test('should filter users by search', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Search for admin
    await adminPage.getByPlaceholder('Search by name, email, or role...').fill('admin');
    await expect(adminPage.getByText('admin@tkd.local')).toBeVisible();
  });

  test('should open create user dialog', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    await adminPage.getByRole('button', { name: /Add Staff User/i }).click();
    await expect(adminPage.getByText('Create Staff User')).toBeVisible();
    await expect(adminPage.getByText('First Name *')).toBeVisible();
    await expect(adminPage.getByText('Email *').first()).toBeVisible();
    await expect(adminPage.getByText('Password *')).toBeVisible();
  });

  test('should open role management dialog', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Click the first Roles button in the table
    await adminPage.getByRole('button', { name: /Roles/i }).first().click();
    await adminPage.waitForTimeout(500);
    // Dialog title includes user name: "Manage Roles — FirstName LastName"
    await expect(adminPage.getByText(/Manage Roles/i).first()).toBeVisible();

    // Should show role checkboxes
    await expect(adminPage.getByText('organizer').first()).toBeVisible();
  });

  test('should open user detail dialog', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Click the eye icon (view details) for first user
    await adminPage.locator('button[title="View details"]').first().click();
    await adminPage.waitForTimeout(500);
    await expect(adminPage.getByText('User Details').first()).toBeVisible();
    await expect(adminPage.getByText('Email').first()).toBeVisible();
    await expect(adminPage.getByText('Status').first()).toBeVisible();
  });
});
