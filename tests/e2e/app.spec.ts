import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

// E2E tests require a built app. Run `npm run package` first.
// These tests verify the full Electron app behavior.

test.describe('Bayside Video Studio E2E', () => {
  test.skip(
    !process.env.RUN_E2E,
    'Set RUN_E2E=true and build the app first to run E2E tests',
  );

  test('app launches and shows welcome screen', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../.vite/build/main.js')],
      env: { ...process.env, DEV_MODE: 'true' },
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // Welcome screen should be visible
    await expect(window.getByText('Bayside Video Studio')).toBeVisible();
    await expect(window.getByText('Tap to Begin')).toBeVisible();

    await app.close();
  });

  test('navigates from welcome to email screen', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../.vite/build/main.js')],
      env: { ...process.env, DEV_MODE: 'true' },
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await window.getByText('Tap to Begin').click();
    await expect(window.getByText('Enter Your Email')).toBeVisible();

    await app.close();
  });

  test('validates email before allowing continue', async () => {
    const app = await electron.launch({
      args: [path.join(__dirname, '../../.vite/build/main.js')],
      env: { ...process.env, DEV_MODE: 'true' },
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    await window.getByText('Tap to Begin').click();

    // Continue should be disabled without email
    const continueBtn = window.getByText('Continue');
    await expect(continueBtn).toBeDisabled();

    // Type valid email
    await window.getByPlaceholder('your@email.com').fill('test@example.com');
    await expect(continueBtn).toBeEnabled();

    await app.close();
  });
});
