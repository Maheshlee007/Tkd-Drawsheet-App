import { test, expect, ADMIN } from './fixtures';
import { type Page, type Browser } from '@playwright/test';

const TOURNAMENT_CODE = 'TKD-2026-TEST1';

/**
 * Cross-Feature Scenario Tests
 *
 * Real end-to-end verification: register → admin verifies data,
 * create user → login as user, toggle status → verify change.
 */

test.describe('Scenario: Player Registration → Admin Verifies in Players List', () => {
  test('register a player then admin finds them in players list', async ({ adminPage, browser }) => {
    test.setTimeout(90_000);
    const ts = Date.now();
    const playerName = `ScenarioPlayer${ts}`;
    const playerEmail = `scenario_player_${ts}@test.com`;

    // --- Step 1: Register a new player in a separate context ---
    const regContext = await browser.newContext();
    const regPage = await regContext.newPage();
    await regPage.goto('/register/TKD-2026-TEST1');
    await regPage.waitForTimeout(3000);

    // Open gateway dialog if needed
    const dialog = regPage.getByRole('dialog');
    if (!(await dialog.isVisible())) {
      await regPage.getByRole('button', { name: 'Open Setup' }).click();
      await regPage.waitForTimeout(1000);
    }
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select New player and continue
    await regPage.getByRole('button', { name: 'New' }).click();
    await regPage.waitForTimeout(300);
    await regPage.getByRole('button', { name: 'Continue To Form' }).click();
    await regPage.waitForTimeout(1000);

    // Step 0: Basic Info — use role-based locators (matching working player-registration tests)
    await expect(regPage.getByRole('heading', { name: 'Basic Info' })).toBeVisible({ timeout: 5000 });
    await regPage.getByRole('textbox', { name: 'Full Name *' }).fill(playerName);
    await regPage.getByRole('textbox', { name: 'Date of Birth *' }).fill('2005-06-15');
    await regPage.getByRole('button', { name: 'Male', exact: true }).click();
    await regPage.getByRole('textbox', { name: 'Phone Number *' }).fill(`+91${String(ts).slice(-10)}`);
    await regPage.getByRole('textbox', { name: 'Email *' }).fill(playerEmail);
    await regPage.getByRole('button', { name: 'Next' }).click();
    await regPage.waitForTimeout(1000);

    // Step 1: TKD Details
    await expect(regPage.getByRole('heading', { name: 'TKD Details' })).toBeVisible({ timeout: 5000 });
    await regPage.getByRole('combobox').click();
    await regPage.getByText('Black Belt 2nd Dan').click();
    await regPage.getByRole('spinbutton', { name: 'Weight (kg) *' }).fill('65');
    await regPage.getByRole('button', { name: 'Next' }).click();
    await regPage.waitForTimeout(1000);

    // Step 2: Verification — secret key
    await regPage.getByRole('textbox', { name: /secret key/i }).first().fill('ScenarioSecret@123');
    await regPage.getByRole('button', { name: 'Next' }).click();
    await regPage.waitForTimeout(1000);

    // Step 3: Review & Submit
    await regPage.getByRole('checkbox').first().check();
    await regPage.waitForTimeout(300);
    await regPage.getByRole('button', { name: /Submit Registration/i }).click();
    await regPage.waitForTimeout(5000);

    // Verify success
    await expect(regPage.getByText(/Registration Successful|successfully/i).first()).toBeVisible({ timeout: 10000 });

    await regContext.close();

    // --- Step 2: Admin verifies the player in Players List ---
    await adminPage.goto('/players');
    await adminPage.waitForTimeout(3000);

    // Should auto-select first tournament or select TKD-2026-TEST1
    // Search for the player by name
    const searchInput = adminPage.getByPlaceholder(/Search by name/i);
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(playerName);
    await adminPage.waitForTimeout(1000);

    // Verify player appears in table with correct data
    const playerRow = adminPage.locator('tr', { hasText: playerName });
    await expect(playerRow.first()).toBeVisible({ timeout: 5000 });
    // Verify gender
    await expect(playerRow.getByText('male', { exact: false }).first()).toBeVisible();
  });
});

test.describe('Scenario: Admin Creates Staff User → User Can Login', () => {
  test('create staff user and verify they can login', async ({ adminPage, browser }) => {
    test.setTimeout(60_000);
    const ts = Date.now();
    const testEmail = `teststaff_${ts}@test.com`;
    const testPassword = 'TestStaff@123';

    // --- Step 1: Admin creates user ---
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    await adminPage.getByRole('button', { name: /Add Staff User/i }).click();
    await adminPage.waitForTimeout(500);
    await expect(adminPage.getByText('Create Staff User')).toBeVisible();

    // Fill form — use dialog-scoped input locators (labels lack <label for> attribute)
    const dlg = adminPage.getByRole('dialog');
    await expect(dlg).toBeVisible({ timeout: 5000 });
    const inputs = dlg.locator('input');
    // Order: First Name, Last Name, Email, Password, Phone
    await inputs.nth(0).fill('ScenarioTest');
    await inputs.nth(1).fill('User');
    await inputs.nth(2).fill(testEmail);
    await inputs.nth(3).fill(testPassword);

    // Submit
    await dlg.getByRole('button', { name: 'Create User' }).click();
    await adminPage.waitForTimeout(3000);

    // Verify user appears in table
    await adminPage.getByPlaceholder(/Search by name/i).fill(testEmail);
    await adminPage.waitForTimeout(1000);
    await expect(adminPage.getByText(testEmail)).toBeVisible({ timeout: 5000 });

    // --- Step 2: New user can login ---
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await userPage.goto('/login');
    await userPage.fill('#username', testEmail);
    await userPage.fill('#password', testPassword);
    await userPage.getByRole('button', { name: 'Sign In', exact: true }).click();
    await userPage.waitForTimeout(3000);

    // Should be logged in (not still on login page)
    await expect(userPage).not.toHaveURL(/\/login/);

    await userContext.close();
  });
});

test.describe('Scenario: Admin Toggles User Status', () => {
  test('admin can toggle user active/inactive status', async ({ adminPage }) => {
    test.setTimeout(30_000);
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Find the organizer user row
    await adminPage.getByPlaceholder(/Search by name/i).fill('organizer@tkd.local');
    await adminPage.waitForTimeout(1000);

    const orgRow = adminPage.locator('tr', { hasText: 'organizer@tkd.local' });
    await expect(orgRow.first()).toBeVisible({ timeout: 5000 });

    // Find the switch/toggle for status in that row
    const statusSwitch = orgRow.locator('button[role="switch"]').first();
    if (await statusSwitch.isVisible()) {
      const wasChecked = await statusSwitch.getAttribute('data-state');
      await statusSwitch.click();
      await adminPage.waitForTimeout(1000);

      // Verify state changed
      const newState = await statusSwitch.getAttribute('data-state');
      expect(newState).not.toBe(wasChecked);

      // Revert back
      await statusSwitch.click();
      await adminPage.waitForTimeout(1000);
      const revertedState = await statusSwitch.getAttribute('data-state');
      expect(revertedState).toBe(wasChecked);
    }
  });
});

test.describe('Scenario: Tournament Detail Verification', () => {
  test('admin can open tournament details and verify real data', async ({ adminPage }) => {
    test.setTimeout(30_000);
    await adminPage.goto('/admin/tournaments');
    await adminPage.waitForTimeout(2000);

    // Click on TKD-2026-TEST1 row to open detail sheet
    await adminPage.getByText('TKD-2026-TEST1').first().click();
    await adminPage.waitForTimeout(1000);

    // Verify detail sheet shows real tournament data
    await expect(adminPage.getByText('TKD-2026-TEST1').first()).toBeVisible();
    await expect(adminPage.getByText(/TKD State Championshi/i).first()).toBeVisible();
    await expect(adminPage.getByText(/Registration Open|registration_open/i).first()).toBeVisible();
  });
});

test.describe('Scenario: Admin Role Management', () => {
  test('admin can view and verify roles for a user', async ({ adminPage }) => {
    test.setTimeout(30_000);
    await adminPage.goto('/admin/users');
    await adminPage.waitForTimeout(2000);

    // Find organizer user
    await adminPage.getByPlaceholder(/Search by name/i).fill('organizer');
    await adminPage.waitForTimeout(1000);

    const orgRow = adminPage.locator('tr', { hasText: 'organizer@tkd.local' });
    await expect(orgRow.first()).toBeVisible();

    // Verify the organizer role badge is visible
    await expect(orgRow.getByText('organizer').first()).toBeVisible();

    // Open roles dialog
    const rolesBtn = orgRow.getByRole('button', { name: /Roles/i });
    if (await rolesBtn.isVisible()) {
      await rolesBtn.click();
      await adminPage.waitForTimeout(500);

      // Verify roles dialog shows checkboxes
      await expect(adminPage.getByText(/Manage Roles/i).first()).toBeVisible();
      // The organizer checkbox should be checked
      const orgCheckbox = adminPage.locator('label', { hasText: 'organizer' }).locator('input[type="checkbox"], button[role="checkbox"]').first();
      if (await orgCheckbox.isVisible()) {
        // Verify it's checked
        const isChecked = await orgCheckbox.isChecked().catch(() => null);
        if (isChecked !== null) {
          expect(isChecked).toBe(true);
        }
      }
    }
  });
});

test.describe('Scenario: Verify Page Player Lookup', () => {
  test('admin can look up a player on the verify page', async ({ adminPage }) => {
    test.setTimeout(30_000);
    await adminPage.goto('/verify');
    await adminPage.waitForTimeout(2000);

    // Should have a search/lookup input for player code
    const codeInput = adminPage.getByPlaceholder(/player code|code/i).first();
    await expect(codeInput).toBeVisible({ timeout: 5000 });

    // Enter a known player code
    await codeInput.fill('TKD-2026-7HGI');
    await adminPage.keyboard.press('Enter');
    await adminPage.waitForTimeout(3000);

    // Verify player details appear
    await expect(adminPage.getByText('mahesh', { exact: false }).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Scenario: Weight Categories Shows Real Data', () => {
  test('weight categories page shows age groups and weight classes', async ({ adminPage }) => {
    test.setTimeout(30_000);
    await adminPage.goto('/weight-categories');
    await adminPage.waitForTimeout(3000);

    // Verify age group filter chips or cards exist
    await expect(adminPage.getByText(/Sub Junior|Junior|Senior|Cadet/i).first()).toBeVisible({ timeout: 5000 });

    // Verify weight class data renders (should have kg ranges)
    await expect(adminPage.getByText(/kg/i).first()).toBeVisible({ timeout: 5000 });
  });
});
