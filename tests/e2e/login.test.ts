import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should log in successfully with valid credentials', async ({ page }) => {
        // Go to the login page
        await page.goto('/');

        // Expect correctly formed login page
        await expect(page).toHaveTitle(/Melann/i);

        // Fill in credentials
        await page.getByPlaceholder('Enter your username').fill('ops_manager');
        await page.getByPlaceholder('Enter your password').fill('ops123');

        // Click Sign In
        await Promise.all([
            page.waitForResponse(response => response.url().includes('/api/auth/login')),
            page.getByRole('button', { name: 'Sign In' }).click()
        ]);

        // Should redirect to dashboard
        await expect(page).toHaveURL(/.*dashboard/);

        // Check for current dashboard content
        await expect(page.getByRole('heading', { name: 'Good Morning, ops_manager' })).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        await page.goto('/');

        await page.getByPlaceholder('Enter your username').fill('wronguser');
        await page.getByPlaceholder('Enter your password').fill('wrongpass');

        await Promise.all([
            page.waitForResponse(response => response.url().includes('/api/auth/login')),
            page.getByRole('button', { name: 'Sign In' }).click()
        ]);

        // Check for error message
        await expect(page.getByText(/Invalid/i)).toBeVisible();
    });
});
