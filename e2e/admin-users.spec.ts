import { test, expect } from './fixtures';

test.describe('Admin User Management', () => {
  test('should display user list with stats', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForLoadState('networkidle');

    // Stats cards
    await expect(adminPage.getByText('Total')).toBeVisible();

    // Users table
    await expect(adminPage.getByText('Staff Users')).toBeVisible();
    await expect(adminPage.getByRole('table')).toBeVisible();

    // At least the admin user should be in the table
    await expect(adminPage.getByText('admin@tkd.local')).toBeVisible();
  });

  test('should filter users by search', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForLoadState('networkidle');

    // Search for admin
    await adminPage.getByPlaceholder('Search by name, email, or role...').fill('admin');
    await expect(adminPage.getByText('admin@tkd.local')).toBeVisible();
  });

  test('should open create user dialog', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForLoadState('networkidle');

    await adminPage.getByRole('button', { name: /Add Staff User/i }).click();
    await expect(adminPage.getByText('Create Staff User')).toBeVisible();
    await expect(adminPage.getByLabel('First Name *')).toBeVisible();
    await expect(adminPage.getByLabel('Email *')).toBeVisible();
    await expect(adminPage.getByLabel('Password *')).toBeVisible();
  });

  test('should open role management dialog', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForLoadState('networkidle');

    // Click the first Roles button
    await adminPage.getByRole('button', { name: /Roles/i }).first().click();
    await expect(adminPage.getByText('Manage Roles')).toBeVisible();

    // Should show role checkboxes
    await expect(adminPage.getByText('organizer')).toBeVisible();
    await expect(adminPage.getByText('coach')).toBeVisible();
  });

  test('should open user detail dialog', async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await adminPage.waitForLoadState('networkidle');

    // Click the eye icon (view details) for first user
    await adminPage.locator('button[title="View details"]').first().click();
    await expect(adminPage.getByText('User Details')).toBeVisible();
    await expect(adminPage.getByText('Email')).toBeVisible();
    await expect(adminPage.getByText('Status')).toBeVisible();
  });
});
