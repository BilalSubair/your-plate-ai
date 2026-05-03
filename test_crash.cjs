const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') console.log('[PAGE ERROR]:', msg.text());
    });
    page.on('pageerror', error => {
        console.log('[PAGE EXCEPTION]:', error.message, error.stack);
    });

    try {
        await page.goto('http://127.0.0.1:5173/auth', { waitUntil: 'load' });
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'auth_page_test.png' });
        console.log("Screenshot saved to auth_page_test.png");

    } catch (err) {
        console.error('SCRIPT ERROR:', err.message);
    }

    await browser.close();
})();
