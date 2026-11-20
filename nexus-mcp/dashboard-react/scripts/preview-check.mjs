import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('../../.local-history/previews', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: '../../.local-history/previews/overview-desktop.png', fullPage: true });
await page.getByRole('link', { name: 'AI assistant AI' }).click();
await page.screenshot({ path: '../../.local-history/previews/assistant-desktop.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://127.0.0.1:5173/#/overview', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: '../../.local-history/previews/overview-mobile.png', fullPage: true });
console.log(JSON.stringify({ errors, mobileOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) }));
await browser.close();
