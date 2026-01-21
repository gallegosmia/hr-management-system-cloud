import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should log in successfully with valid credentials', async ({ page }) => {
        // Go to the login page
        await page.goto('/');

        // Expect correctly formed login page
        await expect(page).toHaveTitle(/Melann/i);

        // Fill in credentials
        await page.getByPlaceholder('Enter your username').fill('Mel');
        await page.getByPlaceholder('Enter your password').fill('admin123');

        // Click Sign In
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Should redirect to dashboard
        await expect(page).toHaveURL(/.*dashboard/);

        // Check for dashboard content (using heading to be specific)
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/');

        await page.getByPlaceholder('Enter your username').fill('wronguser');
        await page.getByPlaceholder('Enter your password').fill('wrongpass');

        await page.getByRole('button', { name: 'Sign In' }).click();

        // Check for error message
        await expect(page.getByText(/Invalid/i)).toBeVisible();
    });
});
