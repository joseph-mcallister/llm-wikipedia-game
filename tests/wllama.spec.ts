import { test, expect } from '@playwright/test';
import { MODELS } from '../app/utils/llm';

test.describe('Wllama Integration Tests', () => {
  test('should load home page and display correct title', async ({ page }) => {
    await page.goto('/');
    const title = await page.getByText('The Wikipedia Game');
    await expect(title).toBeVisible();
  });

  test('should load eval page and display model details', async ({ page }) => {
    await page.goto(`/eval?modelId=${MODELS[0].id}`);
    const modelDetails = await page.getByText(MODELS[0].name);
    await expect(modelDetails).toBeVisible();
  });
  
}); 