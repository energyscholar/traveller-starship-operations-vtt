const puppeteer = require('puppeteer');
const { fullUrl } = require('./config');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  await page.goto(fullUrl);
  await page.waitForSelector('#btn-gm-login', { timeout: 10000 });
  await page.evaluate(() => document.getElementById('btn-gm-login').click());
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => document.getElementById('btn-start-session').click());
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => showSystemMap());
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => goToPlace('loc-dock-highport'));
  await new Promise(r => setTimeout(r, 500));

  console.log('=== AR-104 DEBUG ===');
  logs.filter(l => l.includes('AR-104 debug') || l.includes('Station framing') || l.includes('Going to')).slice(0,10).forEach(l => console.log(l));

  await browser.close();
})().catch(e => console.error('Error:', e.message));
