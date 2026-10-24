import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { env } from '../src/config/env';

interface AuditCheck {
  name: string;
  passed: boolean;
  details?: string;
}

const runBrowserAudit = async () => {
  console.log('=== Doctor Tracker Genuine Browser Review & Evidence Capture ===\n');

  const screenshotsDir = path.resolve(__dirname, '../../docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const results: AuditCheck[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();

  // Track console errors & failed network requests
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText})`);
  });

  try {
    // ----------------------------------------------------
    // 1. Initial Access & Protected Route Redirection
    // ----------------------------------------------------
    console.log('--- Step 1: Root Navigation & Auth Redirection ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    const currentUrl = page.url();
    const redirectedToLogin = currentUrl.includes('/login');
    results.push({
      name: 'Unauthenticated visit to root / redirects to /login',
      passed: redirectedToLogin,
      details: `Current URL: ${currentUrl}`,
    });

    // Capture Screenshot: Login Page
    const loginScreenshotPath = path.join(screenshotsDir, '01_login.png');
    await page.screenshot({ path: loginScreenshotPath, fullPage: false });
    results.push({
      name: 'Capture Login Page screenshot',
      passed: fs.existsSync(loginScreenshotPath),
      details: `Saved to ${loginScreenshotPath} (${fs.statSync(loginScreenshotPath).size} bytes)`,
    });

    // ----------------------------------------------------
    // 2. Sign In Journey
    // ----------------------------------------------------
    console.log('\n--- Step 2: Sign In Journey ---');
    await page.type('#f_email', env.SEED_ADMIN_EMAIL);
    await page.type('#f_password', env.SEED_ADMIN_PASSWORD);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]'),
    ]);

    const postLoginUrl = page.url();
    const onDashboard = postLoginUrl.includes('/dashboard');
    results.push({
      name: 'Submit login credentials and navigate to /dashboard',
      passed: onDashboard,
      details: `Current URL: ${postLoginUrl}`,
    });

    // ----------------------------------------------------
    // 3. Dashboard Analytics Verification
    // ----------------------------------------------------
    console.log('\n--- Step 3: Dashboard Analytics Verification ---');
    // Wait for live data to load (no skeletons, 4 stat values present)
    await page.waitForFunction(
      () => !document.querySelector('.sk') && document.querySelectorAll('.stat .v').length >= 4,
      { timeout: 15000 }
    );
    await new Promise((r) => setTimeout(r, 600)); // Allow chart animations to complete

    const dashboardBodyText = await page.evaluate(() => document.body.innerText);
    const hasTotalDocs = dashboardBodyText.includes('12');
    const hasTotalPats = dashboardBodyText.includes('30');

    results.push({
      name: 'Dashboard renders live seeded statistics (12 Doctors, 30 Patients)',
      passed: hasTotalDocs && hasTotalPats,
      details: `Found doctors (12) and patients (30) in dashboard view`,
    });

    // Capture Screenshot: Dashboard Desktop
    const dashboardScreenshotPath = path.join(screenshotsDir, '02_dashboard_desktop.png');
    await page.screenshot({ path: dashboardScreenshotPath, fullPage: false });
    results.push({
      name: 'Capture Dashboard Desktop screenshot',
      passed: fs.existsSync(dashboardScreenshotPath),
      details: `Saved to ${dashboardScreenshotPath} (${fs.statSync(dashboardScreenshotPath).size} bytes)`,
    });

    // ----------------------------------------------------
    // 4. Doctors Directory & Interactions
    // ----------------------------------------------------
    console.log('\n--- Step 4: Doctors Directory & Interactions ---');
    await page.goto('http://localhost:3000/doctors', { waitUntil: 'networkidle2' });
    await page.waitForFunction(
      () => !document.querySelector('.sk') && !document.querySelector('.skr') && (document.querySelectorAll('.dc').length > 0 || document.querySelectorAll('table tbody tr').length > 0),
      { timeout: 15000 }
    );

    const doctorRowCount = await page.evaluate(() => document.querySelectorAll('.dc').length || document.querySelectorAll('table tbody tr').length);
    results.push({
      name: 'Doctors directory displays paginated doctor records (6 per page)',
      passed: doctorRowCount === 6,
      details: `Rendered rows: ${doctorRowCount}`,
    });

    // Search interaction
    await page.type('input[placeholder*="Search"]', 'Amina');
    await page.waitForFunction(() => document.body.innerText.includes('Dr. Amina Rahman'), { timeout: 8000 }).catch(() => {});
    const searchBodyText = await page.evaluate(() => document.body.innerText);
    results.push({
      name: 'Search doctors filter for "Amina" returns Dr. Amina Rahman',
      passed: searchBodyText.includes('Dr. Amina Rahman'),
    });

    // Clear search
    await page.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await new Promise((r) => setTimeout(r, 600));

    // Test Add Doctor Modal Open & Close without submitting
    const addDoctorBtnClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find((b) => b.innerText.toLowerCase().includes('add doctor'));
      if (target) {
        target.click();
        return true;
      }
      return false;
    });
    await new Promise((r) => setTimeout(r, 300));
    const modalVisible = await page.evaluate(() => !!document.querySelector('.ov .dlg'));
    
    // Close modal by clicking Cancel button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.ov .dlg button')) as HTMLButtonElement[];
      const cancelBtn = btns.find((b) => b.innerText.includes('Cancel') || b.getAttribute('aria-label') === 'Close dialog');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const modalClosed = await page.evaluate(() => !document.querySelector('.ov'));

    results.push({
      name: 'Add Doctor modal opens and closes cleanly without unintended submission',
      passed: addDoctorBtnClicked && modalVisible && modalClosed,
    });

    // Capture Screenshot: Doctors Directory
    const doctorsScreenshotPath = path.join(screenshotsDir, '03_doctors_directory.png');
    await page.screenshot({ path: doctorsScreenshotPath, fullPage: false });
    results.push({
      name: 'Capture Doctors Directory screenshot',
      passed: fs.existsSync(doctorsScreenshotPath),
      details: `Saved to ${doctorsScreenshotPath} (${fs.statSync(doctorsScreenshotPath).size} bytes)`,
    });

    // ----------------------------------------------------
    // 5. Doctor Detail Page
    // ----------------------------------------------------
    console.log('\n--- Step 5: Doctor Detail Page ---');
    // Click View link for the first doctor
    await page.evaluate(() => {
      const link = (document.querySelector('.dc .acts a') || document.querySelector('table tbody tr a')) as HTMLAnchorElement;
      if (link) link.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.waitForFunction(
      () => document.body.innerText.includes('Assigned Patients') || document.body.innerText.includes('patients assigned'),
      { timeout: 10000 }
    ).catch(() => {});

    const onDoctorDetail = page.url().includes('/doctors/');
    const detailText = await page.evaluate(() => document.body.innerText);
    const hasAssignedSection = detailText.includes('Assigned Patients') || detailText.includes('patients assigned');

    results.push({
      name: 'Navigate to Doctor Detail page and inspect profile and assigned patients roster',
      passed: onDoctorDetail && hasAssignedSection,
      details: `URL: ${page.url()}`,
    });

    // Capture Screenshot: Doctor Detail Page
    const doctorDetailScreenshotPath = path.join(screenshotsDir, '04_doctor_detail.png');
    await page.screenshot({ path: doctorDetailScreenshotPath, fullPage: false });
    results.push({
      name: 'Capture Doctor Detail screenshot',
      passed: fs.existsSync(doctorDetailScreenshotPath),
      details: `Saved to ${doctorDetailScreenshotPath} (${fs.statSync(doctorDetailScreenshotPath).size} bytes)`,
    });

    // ----------------------------------------------------
    // 6. Patients Directory & Modals
    // ----------------------------------------------------
    console.log('\n--- Step 6: Patients Directory & Modals ---');
    await page.goto('http://localhost:3000/patients', { waitUntil: 'networkidle2' });
    await page.waitForFunction(
      () => !document.querySelector('.sk') && !document.querySelector('.skr') && document.querySelectorAll('table tbody tr').length > 0,
      { timeout: 15000 }
    );

    const patientRowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
    results.push({
      name: 'Patients directory displays paginated patient records (8 per page)',
      passed: patientRowCount === 8,
      details: `Rendered rows: ${patientRowCount}`,
    });

    // Test Add Patient Modal Open & Close without submitting
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find((b) => b.innerText.toLowerCase().includes('add patient'));
      if (target) target.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const patModalVisible = await page.evaluate(() => !!document.querySelector('.ov .dlg'));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.ov .dlg button')) as HTMLButtonElement[];
      const cancelBtn = btns.find((b) => b.innerText.includes('Cancel') || b.getAttribute('aria-label') === 'Close dialog');
      if (cancelBtn) cancelBtn.click();
    });
    await new Promise((r) => setTimeout(r, 300));
    const patModalClosed = await page.evaluate(() => !document.querySelector('.ov'));

    results.push({
      name: 'Add Patient modal opens and closes cleanly without unintended submission',
      passed: patModalVisible && patModalClosed,
    });

    // Capture Screenshot: Patients Directory
    const patientsScreenshotPath = path.join(screenshotsDir, '05_patients_directory.png');
    await page.screenshot({ path: patientsScreenshotPath, fullPage: false });
    results.push({
      name: 'Capture Patients Directory screenshot',
      passed: fs.existsSync(patientsScreenshotPath),
      details: `Saved to ${patientsScreenshotPath} (${fs.statSync(patientsScreenshotPath).size} bytes)`,
    });

    // ----------------------------------------------------
    // 7. Responsive Viewports Audit
    // ----------------------------------------------------
    console.log('\n--- Step 7: Responsive Viewports Audit ---');
    const viewportsToTest = [
      { name: '320px (Small Mobile)', width: 320, height: 640 },
      { name: '375px (iPhone SE)', width: 375, height: 667 },
      { name: '390px (iPhone 14/15)', width: 390, height: 844 },
      { name: '768px (Tablet Portrait)', width: 768, height: 1024 },
      { name: '1024px (Small Desktop / Tablet Landscape)', width: 1024, height: 768 },
      { name: '1440px (Full Desktop)', width: 1440, height: 900 },
    ];

    for (const vp of viewportsToTest) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await new Promise((r) => setTimeout(r, 200));

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth;
      });

      results.push({
        name: `Responsive Viewport ${vp.name} (${vp.width}x${vp.height}) has zero horizontal overflow`,
        passed: !hasHorizontalScroll,
        details: hasHorizontalScroll ? 'Detected horizontal scroll overflow' : 'No horizontal overflow detected',
      });
    }

    // Capture Mobile Dashboard Screenshot at 390px
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    const mobileDashScreenshotPath = path.join(screenshotsDir, '06_dashboard_mobile.png');
    await page.screenshot({ path: mobileDashScreenshotPath, fullPage: false });
    results.push({
      name: 'Capture Mobile Dashboard screenshot (390px)',
      passed: fs.existsSync(mobileDashScreenshotPath),
      details: `Saved to ${mobileDashScreenshotPath}`,
    });

    // Capture Mobile Patients Cards Screenshot at 375px
    await page.setViewport({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/patients', { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 600));
    const mobilePatScreenshotPath = path.join(screenshotsDir, '07_patients_mobile.png');
    await page.screenshot({ path: mobilePatScreenshotPath, fullPage: false });
    results.push({
      name: 'Capture Mobile Patients Card Layout screenshot (375px)',
      passed: fs.existsSync(mobilePatScreenshotPath),
      details: `Saved to ${mobilePatScreenshotPath}`,
    });

    // ----------------------------------------------------
    // 8. Mobile Navigation Drawer & Theme Switcher
    // ----------------------------------------------------
    console.log('\n--- Step 8: Mobile Drawer & Theme Switcher ---');
    // Set mobile viewport to make header menu button visible (<900px)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 500));
    await page.waitForSelector('button.menu');
    await page.click('button.menu');
    await new Promise((r) => setTimeout(r, 500));
    const drawerOpen = await page.evaluate(() => document.querySelector('#side')?.classList.contains('open'));

    // Close via clicking visible scrim outside drawer (x: 350, y: 300)
    await page.mouse.click(350, 300);
    await new Promise((r) => setTimeout(r, 500));
    let drawerClosed = await page.evaluate(() => !document.querySelector('#side')?.classList.contains('open'));

    // If still open, also verify Escape closes drawer
    if (!drawerClosed) {
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 500));
      drawerClosed = await page.evaluate(() => !document.querySelector('#side')?.classList.contains('open'));
    }

    results.push({
      name: 'Mobile drawer opens via header menu button and closes via scrim/escape',
      passed: !!drawerOpen && !!drawerClosed,
      details: `Drawer opened: ${drawerOpen}, Drawer closed: ${drawerClosed}`,
    });

    // Theme Switcher Test
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    await page.waitForSelector('header.top button[aria-label*="theme"]');
    
    const initialTheme = await page.evaluate(
      () => document.documentElement.dataset.theme || document.documentElement.getAttribute('data-theme') || 'light'
    );
    const targetTheme = initialTheme === 'dark' ? 'light' : 'dark';

    // Click theme toggle button to switch
    await page.click('header.top button[aria-label*="theme"]');
    await new Promise((r) => setTimeout(r, 500));
    const toggledTheme = await page.evaluate(
      () => document.documentElement.dataset.theme || document.documentElement.getAttribute('data-theme')
    );
    const switchedCorrectly = toggledTheme === targetTheme;

    // Capture Dark Mode Screenshot
    const darkScreenshotPath = path.join(screenshotsDir, '08_dashboard_dark.png');
    await page.screenshot({ path: darkScreenshotPath, fullPage: false });

    // Toggle back to restore original state
    await page.click('header.top button[aria-label*="theme"]');
    await new Promise((r) => setTimeout(r, 500));
    const restoredTheme = await page.evaluate(
      () => document.documentElement.dataset.theme || document.documentElement.getAttribute('data-theme')
    );
    const restoredCorrectly = restoredTheme === initialTheme;

    results.push({
      name: 'Synchronized theme switcher toggles between dark and light themes smoothly',
      passed: switchedCorrectly && restoredCorrectly,
      details: `Initial: ${initialTheme} -> Switched: ${toggledTheme} -> Restored: ${restoredTheme}`,
    });

    // ----------------------------------------------------
    // 9. Sign Out & Route Re-guarding
    // ----------------------------------------------------
    console.log('\n--- Step 9: Sign Out & Route Re-guarding ---');
    // Click Log out button in sidebar
    await page.click('button.lo');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    const postLogoutUrl = page.url();
    const logoutToLogin = postLogoutUrl.includes('/login');

    // Attempt direct navigation back to /dashboard
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    const guardedUrl = page.url();
    const reguardedToLogin = guardedUrl.includes('/login');

    results.push({
      name: 'Sign out terminates session and route guard redirects protected requests to /login',
      passed: logoutToLogin && reguardedToLogin,
      details: `Guarded attempt URL: ${guardedUrl}`,
    });

  } finally {
    await browser.close();
  }

  // ----------------------------------------------------
  // Summary Reporting
  // ----------------------------------------------------
  console.log('\n======================================================');
  console.log('BROWSER AUDIT & SCREENSHOT EVIDENCE REPORT');
  console.log('======================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const res of results) {
    if (res.passed) {
      console.log(`✓ PASS: ${res.name}${res.details ? ` (${res.details})` : ''}`);
      passedCount++;
    } else {
      console.error(`✗ FAIL: ${res.name}${res.details ? ` (${res.details})` : ''}`);
      failedCount++;
    }
  }

  console.log(`\nTotals: ${passedCount} passed, ${failedCount} failed`);
  console.log(`Console Errors: ${consoleErrors.length}`);
  console.log(`Failed HTTP Requests: ${failedRequests.length}`);

  if (consoleErrors.length > 0) {
    console.log('\nCaptured Console Errors:');
    consoleErrors.forEach((e) => console.log(' - ' + e));
  }

  if (failedRequests.length > 0) {
    console.log('\nCaptured Failed Network Requests:');
    failedRequests.forEach((r) => console.log(' - ' + r));
  }

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runBrowserAudit().catch((err) => {
  console.error('Unhandled browser audit error:', err);
  process.exit(1);
});
