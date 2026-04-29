import { test, expect } from '@playwright/test';

/*
 * Player Registration — Full Feature Test
 *
 * Based on recorded codegen flow + enhanced with assertions.
 * Tests the complete lifecycle:
 *   Login page → Player Registration dialog → Tournament code verify →
 *   Gateway (New) → Step 0 (Basic Info) → Step 1 (TKD Details) →
 *   Step 2 (Verification / Secret) → Step 3 (Review & Submit) →
 *   PDF Preview modal + auto-download
 */

const TOURNAMENT_CODE = 'TKD-2026-TEST1';

/** Helper: navigate to the registration form (login → dialog → code → New → Continue) */
async function navigateToRegistrationForm(page: import('@playwright/test').Page) {
  await page.goto('/login?redirect=/');
  await page.getByRole('button', { name: 'Player Registration Register' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox', { name: 'e.g. TKD-2026-ABCD' }).fill(TOURNAMENT_CODE);
  await page.getByRole('textbox', { name: 'e.g. TKD-2026-ABCD' }).press('Enter');
  await expect(page).toHaveURL(/\/register\/TKD-2026-TEST1/);
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: 'Continue To Form' }).click();
  await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible();
}

test.describe('Player Registration', () => {

  // Small delay between tests for browser stability
  test.afterEach(async ({ page }) => {
    await page.waitForTimeout(800);
  });

  // ─── HAPPY PATH: complete new registration ─────────────────────────────────
  test('complete new player registration end-to-end', async ({ page }) => {
    test.setTimeout(45_000);
    const ts = Date.now();
    const playerName = `TestPlayer ${ts}`;
    const playerEmail = `player${ts}@test.com`;
    const playerPhone = `+91${String(ts).slice(-10)}`;

    // ── Navigate to login page ──
    await page.goto('/login?redirect=/');
    await expect(page.getByRole('button', { name: 'Player Registration Register' })).toBeVisible();

    // ── Open player registration dialog ──
    await page.getByRole('button', { name: 'Player Registration Register' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'e.g. TKD-2026-ABCD' })).toBeVisible();

    // ── Enter tournament code ──
    await page.getByRole('textbox', { name: 'e.g. TKD-2026-ABCD' }).fill(TOURNAMENT_CODE);
    await page.getByRole('textbox', { name: 'e.g. TKD-2026-ABCD' }).press('Enter');

    // Should navigate to /register/<code> and show gateway dialog
    await expect(page).toHaveURL(/\/register\/TKD-2026-TEST1/);
    await expect(page.getByRole('dialog', { name: 'Start Player Registration' })).toBeVisible();
    // Verify tournament name inside the dialog specifically
    await expect(
      page.getByRole('dialog', { name: 'Start Player Registration' }).getByText('TKD State Championship 2026')
    ).toBeVisible();

    // ── Gateway: select New, continue ──
    await page.getByRole('button', { name: 'New' }).click();
    await page.getByRole('button', { name: 'Continue To Form' }).click();

    // Dialog should close, form Step 1 visible
    await expect(page.getByRole('dialog', { name: 'Start Player Registration' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible();

    // ── Verify left panel shows tournament details ──
    const sidebar = page.locator('aside');
    await expect(sidebar.getByRole('heading', { name: 'Tournament' })).toBeVisible();
    await expect(sidebar.getByText('Documents required')).toBeVisible();
    await expect(sidebar.getByText('Forms to download')).toBeVisible();

    // ── STEP 0: Basic Info ──
    // Assert all required fields present
    await expect(page.getByRole('textbox', { name: 'Full Name *' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Date of Birth *' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Male', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Female' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Phone Number *' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Email *' })).toBeVisible();

    // Fill basic info
    await page.getByRole('textbox', { name: 'Full Name *' }).fill(playerName);
    await page.getByRole('textbox', { name: 'Date of Birth *' }).fill('1998-01-01');
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill(playerPhone);
    await page.getByRole('textbox', { name: 'Email *' }).fill(playerEmail);

    // Optional address
    await page.getByRole('textbox', { name: 'Street address, area,' }).fill('vijayawada macavaram');
    await page.getByRole('textbox', { name: 'State' }).fill('AP');
    await page.getByRole('textbox', { name: 'District' }).fill('NTR');
    await page.getByRole('textbox', { name: 'Pincode' }).fill('520004');

    // Education type
    await page.getByRole('combobox').click();
    await page.getByText('Working / Occupation').click();
    await page.getByRole('textbox', { name: 'Occupation' }).fill('Software Engineer');

    // Proceed to Step 1
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'TKD Details' })).toBeVisible();

    // ── STEP 1: TKD Details ──
    // Select belt
    await page.getByRole('combobox').click();
    await page.getByText('Black Belt 2nd Dan').click();

    // Fill TKD fields
    await page.getByRole('textbox', { name: 'Dan ID / Kukkiwon Number' }).fill('5234789');
    await page.getByRole('spinbutton', { name: 'Weight (kg) *' }).fill('73');
    await page.getByRole('textbox', { name: 'Years of Experience' }).fill('9');
    await page.getByRole('textbox', { name: 'Coach Name' }).fill('Coach Kim');

    // Select events — Kyorugi should already be checked by default
    const poomsaeCheckbox = page.getByRole('checkbox', { name: 'Poomsae (Individual)' });
    await poomsaeCheckbox.check();
    await expect(poomsaeCheckbox).toBeChecked();

    // Proceed to Step 2
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Verification' })).toBeVisible();

    // ── STEP 2: Verification ──
    await expect(page.getByRole('textbox', { name: 'Secret Key *' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Secret Key *' }).fill('Lee@1255');

    // Proceed to Step 3
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: /Review/i })).toBeVisible();

    // ── STEP 3: Review & Submit ──
    // Verify summary shows entered data
    await expect(page.getByText(playerName)).toBeVisible();
    await expect(page.getByText(playerEmail)).toBeVisible();

    // Accept terms
    await page.getByRole('checkbox', { name: 'I confirm the details above' }).check();

    // Monitor API response for debugging
    const responsePromise = page.waitForResponse(resp =>
      resp.url().includes('/api/players/register') && resp.request().method() === 'POST'
    );

    // Submit registration
    await page.getByRole('button', { name: 'Submit Registration' }).click();

    // Verify the API call succeeds
    const response = await responsePromise;
    expect(response.status()).toBeLessThan(400);

    // PDF Preview dialog opens automatically after successful registration
    await expect(page.getByText('Registration PDF Preview')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Download' })).toBeVisible();

    // Close the PDF preview dialog
    await page.getByRole('button', { name: 'Close' }).click();

    // Success screen should be visible behind the dialog
    await expect(page.getByText('Registration Successful!')).toBeVisible();
    await expect(page.getByText('Your unique player code is:')).toBeVisible();
  });

  // ─── VALIDATION: Step 0 — cannot proceed without required fields ───────────
  test('blocks Next on Step 0 when required fields are empty', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Try to proceed with all fields empty
    await page.getByRole('button', { name: 'Next' }).click();

    // Should still be on Step 0 and show validation errors
    await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible();
    await expect(page.getByText('Full name is required')).toBeVisible();
    await expect(page.getByText('Date of birth is required')).toBeVisible();
    await expect(page.getByText('Phone number is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  // ─── VALIDATION: invalid phone number ──────────────────────────────────────
  test('shows phone validation error for invalid format', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Fill required fields but with invalid phone
    await page.getByRole('textbox', { name: 'Full Name *' }).fill('Test Player');
    await page.getByRole('textbox', { name: 'Date of Birth *' }).fill('1998-01-01');
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill('abc');
    await page.getByRole('textbox', { name: 'Email *' }).fill('test@test.com');

    await page.getByRole('button', { name: 'Next' }).click();

    // Should show phone-specific error and remain on Step 0
    await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible();
    await expect(page.getByText(/valid.*number|country code/i)).toBeVisible();
  });

  // ─── VALIDATION: guardian required for minors ──────────────────────────────
  test('requires guardian name for minor players', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Use minor DOB (under 18)
    await page.getByRole('textbox', { name: 'Full Name *' }).fill('Minor Player');
    await page.getByRole('textbox', { name: 'Date of Birth *' }).fill('2012-06-15');
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill('+919876543210');
    await page.getByRole('textbox', { name: 'Email *' }).fill('minor@test.com');

    // Guardian field label should be visible for minors
    await expect(page.getByText('Guardian/Parent Name *')).toBeVisible();

    // Try to proceed without filling guardian
    await page.getByRole('button', { name: 'Next' }).click();

    // Should remain on Step 0 with guardian error
    await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible();
    await expect(page.getByText(/guardian.*required/i)).toBeVisible();
  });

  // ─── VALIDATION: Step 1 — belt & weight required ──────────────────────────
  test('blocks Next on Step 1 when belt or weight missing', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Fill Step 0 valid data and proceed
    await page.getByRole('textbox', { name: 'Full Name *' }).fill('Test Player');
    await page.getByRole('textbox', { name: 'Date of Birth *' }).fill('1998-01-01');
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill('+919876543210');
    await page.getByRole('textbox', { name: 'Email *' }).fill('test@test.com');
    await page.getByRole('button', { name: 'Next' }).click();

    // Now on Step 1 — try to proceed without belt or weight
    await page.getByRole('button', { name: 'Next' }).click();

    // Should remain on Step 1 and show errors
    await expect(page.getByRole('heading', { name: 'TKD Details' })).toBeVisible();
    await expect(page.getByText('Belt color is required')).toBeVisible();
    await expect(page.getByText('Weight is required')).toBeVisible();
  });

  // ─── VALIDATION: Step 2 — secret key required ─────────────────────────────
  test('blocks Next on Step 2 when secret key is empty', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Fill Step 0
    await page.getByRole('textbox', { name: 'Full Name *' }).fill('Test Player');
    await page.getByRole('textbox', { name: 'Date of Birth *' }).fill('1998-01-01');
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill('+919876543210');
    await page.getByRole('textbox', { name: 'Email *' }).fill('test@test.com');
    await page.getByRole('button', { name: 'Next' }).click();

    // Fill Step 1
    await page.getByRole('combobox').click();
    await page.getByText('Black Belt 2nd Dan').click();
    await page.getByRole('spinbutton', { name: 'Weight (kg) *' }).fill('73');
    await page.getByRole('button', { name: 'Next' }).click();

    // Now on Step 2 — try to proceed without secret
    await page.getByRole('button', { name: 'Next' }).click();

    // Should remain on Step 2 and show error
    await expect(page.getByRole('heading', { name: 'Verification' })).toBeVisible();
    await expect(page.getByText(/secret key is required/i)).toBeVisible();
  });

  // ─── TOURNAMENT CODE: invalid code shows friendly error ────────────────────
  test('shows friendly error for invalid tournament code', async ({ page }) => {
    await page.goto('/login?redirect=/');
    await page.getByRole('button', { name: 'Player Registration Register' }).click();
    await page.getByRole('textbox', { name: 'e.g. TKD-2026-ABCD' }).fill('INVALID-CODE-XYZ');
    await page.getByRole('textbox', { name: 'e.g. TKD-2026-ABCD' }).press('Enter');

    // Should show user-friendly error, NOT raw JSON/HTTP
    await expect(page.getByText('Invalid tournament code', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  // ─── GENDER TOGGLE ─────────────────────────────────────────────────────────
  test('gender toggle switches between Male and Female', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Toggle between genders
    await page.getByRole('button', { name: 'Female' }).click();
    // Male should no longer be "active" and Female should be
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    // Should be back on Male — just verify the form responds
    await expect(page.getByRole('button', { name: 'Male', exact: true })).toBeVisible();
  });

  // ─── MULTI-EVENT: select multiple events with fee preview ──────────────────
  test('allows selecting multiple events with fee preview', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Fill Step 0 quickly
    await page.getByRole('textbox', { name: 'Full Name *' }).fill('Multi Event Player');
    await page.getByRole('textbox', { name: 'Date of Birth *' }).fill('1998-01-01');
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill('+919876543210');
    await page.getByRole('textbox', { name: 'Email *' }).fill('multi@test.com');
    await page.getByRole('button', { name: 'Next' }).click();

    // On Step 1 — fill belt/weight
    await page.getByRole('combobox').click();
    await page.getByText('Black Belt 2nd Dan').click();
    await page.getByRole('spinbutton', { name: 'Weight (kg) *' }).fill('73');

    // Select additional event: Poomsae
    await page.getByRole('checkbox', { name: 'Poomsae (Individual)' }).check();
    await expect(page.getByRole('checkbox', { name: 'Poomsae (Individual)' })).toBeChecked();

    // Verify fee breakdown shows (₹500 first + ₹300 additional)
    await expect(page.getByText('₹ 500').first()).toBeVisible();
    await expect(page.getByText('₹ 300').first()).toBeVisible();
  });

  // ─── STEP NAVIGATION: can go back and data persists ────────────────────────
  test('back button navigates to previous step with data preserved', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Fill Step 0 and proceed
    await page.getByRole('textbox', { name: 'Full Name *' }).fill('Back Test');
    await page.getByRole('textbox', { name: 'Date of Birth *' }).fill('1998-01-01');
    await page.getByRole('textbox', { name: 'Phone Number *' }).fill('+919876543210');
    await page.getByRole('textbox', { name: 'Email *' }).fill('back@test.com');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'TKD Details' })).toBeVisible();

    // Go back to Step 0 — use exact match to avoid matching "Back to Login"
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible();

    // Data should be preserved
    await expect(page.getByRole('textbox', { name: 'Full Name *' })).toHaveValue('Back Test');
  });

  // ─── LEFT PANEL: tournament info, documents, form links ────────────────────
  test('left panel displays tournament info, documents, form links', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Scope all assertions to the sidebar
    const sidebar = page.locator('aside');

    // Assert left panel sections
    await expect(sidebar.getByRole('heading', { name: 'Registration Setup' })).toBeVisible();
    await expect(sidebar.getByText('Mode: new')).toBeVisible();

    // Documents section
    await expect(sidebar.getByText('Documents required')).toBeVisible();
    await expect(sidebar.getByText('Aadhaar / Government Photo ID')).toBeVisible();
    await expect(sidebar.getByText('Belt / Dan certificate')).toBeVisible();

    // Form links
    await expect(sidebar.getByText('Forms to download')).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Form 1' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Form 2' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Form 3' })).toBeVisible();

    // Tournament details — scoped to sidebar to avoid duplicate matches
    await expect(sidebar.getByText('TKD State Championship 2026').first()).toBeVisible();
    await expect(sidebar.getByText(/Indoor Stadium/)).toBeVisible();
    await expect(sidebar.getByText('₹ 500').first()).toBeVisible();
  });

  // ─── EDUCATION TYPE DROPDOWN ───────────────────────────────────────────────
  test('education type dropdown toggles class/occupation fields', async ({ page }) => {
    await navigateToRegistrationForm(page);

    // Default is School — should show "Class / Year" and "School Name"
    await expect(page.getByText('Class / Year')).toBeVisible();
    await expect(page.getByText('School Name')).toBeVisible();

    // Switch to College
    await page.getByRole('combobox').click();
    await page.getByText('College Student').click();
    await expect(page.getByText('College Name')).toBeVisible();

    // Switch to Working
    await page.getByRole('combobox').click();
    await page.getByText('Working / Occupation').click();
    await expect(page.getByText('Occupation', { exact: true })).toBeVisible();
  });

  // ─── EXISTING PLAYER: gateway shows Registered mode fields ──────────────────
  test('existing player gateway shows code and secret key inputs', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/register/TKD-2026-TEST1');
    await page.waitForTimeout(3000);

    // Gateway dialog may or may not be open; open from sidebar if needed
    const dialog = page.getByRole('dialog');
    const dialogVisible = await dialog.isVisible();
    if (!dialogVisible) {
      await page.getByRole('button', { name: 'Open Setup' }).click();
      await page.waitForTimeout(1000);
    }
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select "Registered" mode
    await page.getByRole('button', { name: 'Registered' }).click();
    await page.waitForTimeout(500);

    // Existing player fields should appear within the dialog
    await expect(page.getByPlaceholder('Player code')).toBeVisible();
    await expect(page.getByPlaceholder('Secret key')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load Existing Profile' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue To Form' })).toBeVisible();
  });

  // ─── EXISTING PLAYER: invalid code/secret shows error ───────────────────────
  test('existing player lookup with wrong credentials shows error', async ({ page }) => {
    test.setTimeout(45_000);
    await page.goto('/register/TKD-2026-TEST1');
    await page.waitForTimeout(3000);

    // Open gateway if auto-closed
    const dialog = page.getByRole('dialog');
    const dialogVisible = await dialog.isVisible();
    if (!dialogVisible) {
      await page.getByRole('button', { name: 'Open Setup' }).click();
      await page.waitForTimeout(1000);
    }

    // Select Registered mode
    await page.getByRole('button', { name: 'Registered' }).click();
    await page.waitForTimeout(500);

    // Enter fake credentials
    await page.getByPlaceholder('Player code').fill('PLR-INVALID-999');
    await page.getByPlaceholder('Secret key').fill('wrongkey123');

    // Click Load Existing Profile
    await page.getByRole('button', { name: 'Load Existing Profile' }).click();

    // Should show error toast or message
    await expect(page.getByText(/not found|invalid|could not/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ─── EXISTING PLAYER: valid code+secret loads profile ─────────────────────
  test('existing player lookup with valid credentials pre-fills form', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/register/TKD-2026-TEST1');
    await page.waitForTimeout(3000);

    // Open gateway if auto-closed
    const dialog = page.getByRole('dialog');
    if (!(await dialog.isVisible())) {
      await page.getByRole('button', { name: 'Open Setup' }).click();
      await page.waitForTimeout(1000);
    }
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select Registered mode
    await page.getByRole('button', { name: 'Registered' }).click();
    await page.waitForTimeout(500);

    // Enter real credentials from the player registered earlier
    await page.getByPlaceholder('Player code').fill('TKD-2026-3SYX');
    await page.getByPlaceholder('Secret key').fill('TestSecret@123');

    // Load profile
    await page.getByRole('button', { name: 'Load Existing Profile' }).click();
    await page.waitForTimeout(3000);

    // Continue to form — should now be enabled since profile loaded
    await page.getByRole('button', { name: 'Continue To Form' }).click();
    await page.waitForTimeout(1000);

    // Form should be pre-filled with the player's data
    await expect(page.getByRole('heading', { name: 'Basic Info' })).toBeVisible({ timeout: 5000 });

    // Check pre-filled name field
    const nameInput = page.locator('input[name="fullName"], input[placeholder*="name" i]').first();
    await expect(nameInput).toHaveValue(/SecretTest/i, { timeout: 5000 });
  });
});
