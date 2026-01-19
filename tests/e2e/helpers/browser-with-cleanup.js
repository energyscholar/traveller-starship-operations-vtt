/**
 * AR-106: Browser cleanup helper for E2E tests
 * AR-198: Enhanced with retry logic, better cleanup, and flakiness reduction
 * Ensures Puppeteer browsers are always closed, even on timeout or error
 */

const puppeteer = require('puppeteer');

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRY_COUNT = 2;
const RETRY_DELAY_MS = 1000;
const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',  // AR-198: Reduces memory issues in Docker/CI
  '--disable-gpu',             // AR-198: Reduces rendering flakiness
  '--disable-extensions'       // AR-198: Faster startup
];

/**
 * Run a test function with automatic browser cleanup
 * @param {Function} fn - Async function that receives (browser, page)
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Timeout in ms (default: 30000)
 * @param {Object} options.viewport - Page viewport (default: 1400x900)
 * @param {boolean} options.headless - Run headless (default: true)
 * @returns {Promise} - Resolves with fn return value, rejects on error/timeout
 */
async function withBrowser(fn, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT_MS,
    viewport = { width: 1400, height: 900 },
    headless = true
  } = options;

  let browser = null;
  let timeoutId = null;
  let timedOut = false;

  // Timeout handler - force cleanup and exit
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error(`Test timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    browser = await puppeteer.launch({
      headless,
      args: PUPPETEER_ARGS
    });

    const page = await browser.newPage();
    await page.setViewport(viewport);

    // Race between test and timeout
    const result = await Promise.race([
      fn(browser, page),
      timeoutPromise
    ]);

    return result;
  } finally {
    // Always clear timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Always close browser
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Browser may already be closed, ignore
        console.error('Warning: browser.close() failed:', e.message);
      }
    }

    // Exit with error code if timed out (for CI)
    if (timedOut) {
      process.exit(1);
    }
  }
}

/**
 * Run a test with browser, server check, and cleanup
 * @param {Function} fn - Async function that receives (browser, page)
 * @param {Object} options - Same as withBrowser, plus:
 * @param {string} options.url - URL to navigate to (default: http://localhost:3000/operations)
 * @param {string} options.waitFor - Selector to wait for after navigation
 */
async function withBrowserAndServer(fn, options = {}) {
  const {
    url = fullUrl,
    waitFor = '#btn-gm-login',
    ...browserOptions
  } = options;

  return withBrowser(async (browser, page) => {
    // Navigate and wait for server
    await page.goto(url, { timeout: 10000 });

    if (waitFor) {
      await page.waitForSelector(waitFor, { timeout: 8000 });
    }

    return fn(browser, page);
  }, browserOptions);
}

/**
 * Collect console logs from page
 * @param {Page} page - Puppeteer page
 * @returns {Object} - { logs: string[], errors: string[] }
 */
function collectLogs(page) {
  const logs = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', err => {
    errors.push(`PageError: ${err.message}`);
  });

  return { logs, errors };
}

/**
 * Wait helper that doesn't block forever
 * @param {number} ms - Milliseconds to wait
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * AR-198: Retry wrapper for flaky tests
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.retries - Number of retries (default: 2)
 * @param {number} options.delay - Delay between retries in ms (default: 1000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @returns {Promise} - Resolves with fn result, rejects after all retries fail
 */
async function withRetry(fn, options = {}) {
  const {
    retries = DEFAULT_RETRY_COUNT,
    delay = RETRY_DELAY_MS,
    shouldRetry = () => true
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable = shouldRetry(err);
      const hasRetries = attempt < retries;

      if (isRetryable && hasRetries) {
        console.log(`[Retry ${attempt + 1}/${retries}] ${err.message}`);
        await wait(delay);
      } else if (!hasRetries) {
        break; // No more retries
      }
    }
  }
  throw lastError;
}

/**
 * AR-198: Run test with browser and automatic retry on flaky failures
 * @param {Function} fn - Async function that receives (browser, page)
 * @param {Object} options - Same as withBrowser + retry options
 */
async function withBrowserRetry(fn, options = {}) {
  const { retries = DEFAULT_RETRY_COUNT, ...browserOptions } = options;

  return withRetry(
    () => withBrowser(fn, browserOptions),
    {
      retries,
      shouldRetry: (err) => {
        // Retry on common flaky errors
        const msg = err.message || '';
        return (
          msg.includes('timeout') ||
          msg.includes('Target closed') ||
          msg.includes('Protocol error') ||
          msg.includes('Navigation timeout') ||
          msg.includes('Execution context')
        );
      }
    }
  );
}

/**
 * AR-198: Safe click with wait for navigation/response
 * @param {Page} page - Puppeteer page
 * @param {string} selector - Element selector
 * @param {Object} options - Click options
 */
async function safeClick(page, selector, options = {}) {
  const { waitForNav = false, waitFor = null, timeout = 5000 } = options;

  await page.waitForSelector(selector, { timeout });

  if (waitForNav) {
    await Promise.all([
      page.waitForNavigation({ timeout }),
      page.click(selector)
    ]);
  } else if (waitFor) {
    await Promise.all([
      page.waitForSelector(waitFor, { timeout }),
      page.click(selector)
    ]);
  } else {
    await page.click(selector);
  }
}

/**
 * AR-198: Safe type with element wait
 * @param {Page} page - Puppeteer page
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 * @param {Object} options - Type options
 */
async function safeType(page, selector, text, options = {}) {
  const { clear = true, timeout = 5000 } = options;

  await page.waitForSelector(selector, { timeout });

  if (clear) {
    await page.$eval(selector, el => el.value = '');
  }

  await page.type(selector, text);
}

module.exports = {
  withBrowser,
  withBrowserAndServer,
  withBrowserRetry,  // AR-198
  withRetry,          // AR-198
  safeClick,          // AR-198
  safeType,           // AR-198
  collectLogs,
  wait,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY_COUNT,
  PUPPETEER_ARGS
};
