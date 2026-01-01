#!/usr/bin/env node
/**
 * Try xdotool mouse drag to move window
 */

const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('=== xdotool Mouse Drag Test ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--window-size=500,400']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 400 });

  await page.setContent(`
    <html>
      <body style="margin:0; background:#c0392b; color:white;
                   display:flex; align-items:center; justify-content:center;
                   height:100vh; font-size:36px; font-weight:bold;">
        DRAG ME
      </body>
    </html>
  `);

  console.log('Window launched. Waiting 2 sec...');
  await delay(2000);

  // Get window position from CDP (even if not accurate, gives us a starting point)
  const client = await page.createCDPSession();
  const { windowId } = await client.send('Browser.getWindowForTarget');
  let { bounds } = await client.send('Browser.getWindowBounds', { windowId });
  console.log(`CDP reports window at: (${bounds.left}, ${bounds.top}), size: ${bounds.width}x${bounds.height}`);

  // Get screen size
  try {
    const screenInfo = execSync('xdpyinfo | grep dimensions', { encoding: 'utf8' });
    console.log(`Screen: ${screenInfo.trim()}`);
  } catch (e) {}

  // Assume window is somewhere in center of screen
  // Try to find it by getting mouse location after moving to center
  const screenWidth = 1920;  // Assume common resolution
  const screenHeight = 1080;

  // If CDP says (0,0) but window isn't there, it's probably centered
  // Let's try clicking center of screen and dragging
  const startX = Math.floor(screenWidth / 2);
  const startY = 50; // Near top for title bar

  console.log(`\nUsing xdotool to drag from (${startX}, ${startY}) to (100, 100)`);

  try {
    // Move mouse to assumed title bar position
    execSync(`xdotool mousemove ${startX} ${startY}`);
    await delay(200);

    // Mouse down
    execSync('xdotool mousedown 1');
    await delay(100);

    // Drag to target (top-left corner)
    execSync('xdotool mousemove 250 50'); // Center of target position
    await delay(100);

    // Mouse up
    execSync('xdotool mouseup 1');
    await delay(500);

    console.log('Drag complete.');
  } catch (e) {
    console.log(`xdotool error: ${e.message}`);
  }

  // Check new position
  ({ bounds } = await client.send('Browser.getWindowBounds', { windowId }));
  console.log(`After drag, CDP says: (${bounds.left}, ${bounds.top})`);

  console.log('\nHolding 5 seconds - did the window move to top-left?');
  await delay(5000);

  await browser.close();
  console.log('Done.');
}

main().catch(console.error);
