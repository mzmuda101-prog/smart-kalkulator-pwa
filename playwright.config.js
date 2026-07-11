// [EN] E2E UI tests — local: auto-start static server; prod: CALC_URL=https://host/... npm run test:e2e
const { defineConfig, devices } = require('playwright/test');
const path = require('path');

const PORT = Number(process.env.CALC_E2E_PORT) || 7920;
const BASE_URL = (process.env.CALC_URL || `http://127.0.0.1:${PORT}/`).replace(/\/?$/, '/');

module.exports = defineConfig({
    testDir: path.join(__dirname, 'test/e2e'),
    timeout: 90_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [
        ['list'],
        ['html', { open: 'never', outputFolder: 'test-results/playwright-report' }],
    ],
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        locale: 'pl-PL',
    },
    projects: [
        { name: 'mobile', use: { browserName: 'chromium', ...devices['iPhone 13'] } },
        { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
        { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
        { name: 'desktop-low', use: { browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
    ],
    webServer: process.env.CALC_URL
        ? undefined
        : {
            command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
            cwd: __dirname,
            url: `${BASE_URL}index.html`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
});
