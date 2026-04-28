const path = require('path');
const { chromium, devices } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo'
  });

  const page = await context.newPage();
  const target = `file://${path.resolve(__dirname, '..', 'index.html')}`;
  await page.goto(target);
  await page.waitForTimeout(1200);

  const outputPath = path.resolve(__dirname, '..', 'screenshots', 'mobile-battle.png');
  await page.screenshot({ path: outputPath, fullPage: true });

  await browser.close();
  console.log(`Screenshot saved: ${outputPath}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
