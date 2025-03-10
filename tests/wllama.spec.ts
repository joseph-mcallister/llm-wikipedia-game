import { test, expect } from '@playwright/test';

test.describe('Wllama Integration Tests', () => {
  test('should load home page and display correct title', async ({ page }) => {
    await page.goto('/');
    const title = await page.getByText('The Wikipedia Game');
    await expect(title).toBeVisible();
  });
  
}); 