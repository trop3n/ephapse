/**
 * Screenshot utility for UI development
 * Usage: have `npm run dev` running, then run `npm run screenshot`
 * Output: scripts/screenshot.png
 */

import { firefox } from 'playwright';

const PORT = process.env.PORT || 5173;
const OUT = new URL('./screenshot.png', import.meta.url).pathname;
const DELAY = parseInt(process.env.DELAY || '1500');

const browser = await firefox.launch();

const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

try {
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });
} catch {
  await page.goto(`http://localhost:${PORT}`);
}

// Let React render and any animations settle
await page.waitForTimeout(DELAY);

await page.screenshot({ path: OUT, fullPage: false });
console.log(`Screenshot saved to ${OUT}`);

await browser.close();
