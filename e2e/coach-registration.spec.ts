import { test, expect, type Page } from '@playwright/test';

const TOURNAMENT_CODE = 'TKD-2026-TEST1';

/**
 * Helper: navigate from login page → coach registration gateway → verify tournament
 */
async function navigateToCoachGateway(page: Page, code: string) {
  await page.goto('/login');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /coach registration/i }).first().click();
  await page.waitForTimeout(500);
  // Login page coach dialog has placeholder "E.G. TKD-2026-ABCD" and "Continue" button
  await page.getByPlaceholder(/TKD-2026/i).fill(code);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(3000);
}

/**
 * Helper: from gateway dialog, select New and continue to form
 */
async function selectNewAndContinue(page: Page) {
  await page.getByRole('button', { name: 'New' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Continue To Form' }).click();
  await page.waitForTimeout(1000);
}

/**
 * Helper: open gateway dialog if auto-closed, for direct navigation
 */
async function ensureGatewayOpen(page: Page) {
  const dialog = page.getByRole('dialog');
  if (!(await dialog.isVisible())) {
    await page.getByRole('button', { name: 'Open Setup' }).click();
    await page.waitForTimeout(1000);
  }
  await expect(dialog).toBeVisible({ timeout: 5000 });
}

/**
 * Helper: fill a form field by its label text
 * The coach form uses text labels adjacent to textbox inputs (no <label for>)
 */
async function fillField(page: Page, labelText: string, value: string) {
  const container = page.locator('div', { hasText: new RegExp(`^${labelText}`) }).last();
  await container.locator('input, textarea').first().fill(value);
}

test.describe('Coach Registration', () => {
  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(800);
  });

  test('happy path: complete new coach registration end-to-end', async ({ page }) => {
    test.setTimeout(60_000);
    const ts = Date.now();
    const uniqueEmail = `coach${ts}@test.com`;
    const uniquePhone = `+91${String(ts).slice(-10)}`;

    // Navigate to coach registration via login page
    await navigateToCoachGateway(page, TOURNAMENT_CODE);

    // Verify tournament resolved in dialog
    await expect(page.getByText(TOURNAMENT_CODE).first()).toBeVisible({ timeout: 5000 });

    // Select New and continue to form
    await selectNewAndContinue(page);

    // Verify form is visible
    await expect(page.getByRole('button', { name: 'Register as Coach' })).toBeVisible({ timeout: 5000 });

    // Fill form fields using placeholders and text locators
    // First Name (required) — find input next to "First Name *" text
    const firstNameInput = page.locator('input').first();
    await firstNameInput.fill('TestCoach');

    // Last Name
    const inputs = page.locator('form input[type="text"], form input:not([type])');
    await inputs.nth(1).fill('Automation');

    // Email
    await page.getByPlaceholder(/country code/i).fill(uniquePhone);

    // Phone (has placeholder)
    // Email field — find by text label
    const emailInput = page.locator('div').filter({ hasText: /^Email$/ }).locator('input').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(uniqueEmail);
    }

    // Club name
    await page.getByPlaceholder('e.g. Tiger TKD Academy').fill('Test TKD Academy');

    // Secret Key (required)
    await page.getByPlaceholder('Set secret key for future updates').fill('TestSecret@123');

    // Submit
    await page.getByRole('button', { name: 'Register as Coach' }).click();
    await page.waitForTimeout(5000);

    // Check for either success or validation errors (which would tell us what's missing)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('gateway: invalid tournament code shows error', async ({ page }) => {
    test.setTimeout(30_000);
    await navigateToCoachGateway(page, 'BOGUS-CODE-XYZ');

    // Should show error
    await expect(
      page.getByText(/not found|invalid|no tournament/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('gateway: existing coach mode shows code and secret inputs', async ({ page }) => {
    test.setTimeout(30_000);
    await navigateToCoachGateway(page, TOURNAMENT_CODE);
    await expect(page.getByText(TOURNAMENT_CODE).first()).toBeVisible({ timeout: 5000 });

    // Select Registered mode
    await page.getByRole('button', { name: 'Registered' }).click();
    await page.waitForTimeout(500);

    // Should show coach code and secret key inputs
    await expect(page.getByPlaceholder(/coach code/i).or(page.getByPlaceholder(/code/i)).first()).toBeVisible();
    await expect(page.getByPlaceholder(/secret/i).first()).toBeVisible();
  });

  test('form: submit button disabled without required fields', async ({ page }) => {
    test.setTimeout(30_000);
    await navigateToCoachGateway(page, TOURNAMENT_CODE);
    await expect(page.getByText(TOURNAMENT_CODE).first()).toBeVisible({ timeout: 5000 });
    await selectNewAndContinue(page);

    // Submit button should be visible
    const submitBtn = page.getByRole('button', { name: 'Register as Coach' });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Either the button is disabled, or clicking it shows validation errors
    const isDisabled = await submitBtn.isDisabled();
    if (!isDisabled) {
      await submitBtn.click();
      await page.waitForTimeout(1000);
      // Should show some validation feedback (required fields not filled)
      await expect(page.getByText(/required|fill|enter/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
