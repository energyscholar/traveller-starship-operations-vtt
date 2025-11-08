// Test Helpers - Minimal token usage output
// Supports quiet mode (summary only) and verbose mode (all details)

const QUIET = process.env.TEST_QUIET === 'true' || process.argv.includes('--quiet');

class TestRunner {
  constructor(suiteName) {
    this.suiteName = suiteName;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];

    if (!QUIET) {
      console.log('========================================');
      console.log(suiteName.toUpperCase());
      console.log('========================================\n');
    }
  }

  test(description, fn) {
    try {
      fn();
      this.passed++;
      if (!QUIET) {
        console.log(`✓ ${description}`);
      }
    } catch (error) {
      this.failed++;
      this.failures.push({ description, error: error.message });
      console.log(`✗ ${description}`);
      console.log(`  ${error.message}`);
    }
  }

  section(name) {
    if (!QUIET && name) {
      console.log(`\n--- ${name} ---\n`);
    }
  }

  finish() {
    const total = this.passed + this.failed;

    if (QUIET && this.failed === 0) {
      // Minimal output: just suite name and count
      console.log(`✓ ${this.suiteName}: ${total} tests`);
    } else {
      // Verbose output or failures
      console.log('\n========================================');
      console.log(`PASSED: ${this.passed}/${total}`);
      if (this.failed > 0) {
        console.log(`FAILED: ${this.failed}/${total}`);
      }
      console.log('========================================');
    }

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Simple assertion helpers
function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertTrue(condition, message = '') {
  if (!condition) {
    throw new Error(message || 'Expected true');
  }
}

function assertFalse(condition, message = '') {
  if (condition) {
    throw new Error(message || 'Expected false');
  }
}

function assertArrayEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

function assertThrows(fn, expectedMessage = null) {
  try {
    fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error "${expectedMessage}", got "${error.message}"`);
    }
  }
}

module.exports = {
  TestRunner,
  assertEqual,
  assertTrue,
  assertFalse,
  assertArrayEqual,
  assertThrows,
  QUIET
};
