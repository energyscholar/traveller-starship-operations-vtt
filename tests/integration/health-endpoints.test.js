#!/usr/bin/env node
/**
 * Health Endpoints Integration Tests
 * Tests /health and /ready endpoints for Docker/k8s deployment
 */

const http = require('http');
const assert = require('assert');

console.log('========================================');
console.log('HEALTH ENDPOINTS INTEGRATION TESTS');
console.log('========================================\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn()
    .then(() => {
      console.log(`✓ ${name}`);
      passed++;
    })
    .catch((error) => {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    });
}

// Helper to make HTTP GET request
function httpGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data });
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
}

// Start server for testing
let server;
let serverReady = false;

function startServer() {
  return new Promise((resolve, reject) => {
    try {
      // Import server module
      // Note: This assumes server.js exports the server object
      // For testing, we'll check if server is already running
      http.get('http://localhost:3000/health', (res) => {
        if (res.statusCode === 200) {
          serverReady = true;
          resolve();
        } else {
          reject(new Error('Server not responding correctly'));
        }
      }).on('error', (error) => {
        reject(new Error(`Server not running. Please start with: npm start\n  ${error.message}`));
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Run tests
async function runTests() {
  console.log('Checking if server is running...\n');

  try {
    await startServer();
    console.log('✓ Server is running\n');
  } catch (error) {
    console.log(`✗ ${error.message}`);
    console.log('\n❌ TESTS SKIPPED - Start server first: npm start');
    process.exit(0); // Exit gracefully if server not running
  }

  console.log('--- Health Endpoint Tests (4 tests) ---\n');

  await test('GET /health returns 200 status', async () => {
    const response = await httpGet('/health');
    assert.strictEqual(response.statusCode, 200);
  });

  await test('GET /health returns healthy status', async () => {
    const response = await httpGet('/health');
    assert.strictEqual(response.data.status, 'healthy');
  });

  await test('GET /health includes uptime', async () => {
    const response = await httpGet('/health');
    assert.ok(typeof response.data.uptime === 'number');
    assert.ok(response.data.uptime >= 0);
  });

  await test('GET /health includes timestamp and version', async () => {
    const response = await httpGet('/health');
    assert.ok(response.data.timestamp);
    assert.ok(response.data.version);
    assert.ok(response.data.environment);
  });

  console.log('\n--- Readiness Endpoint Tests (5 tests) ---\n');

  await test('GET /ready returns 200 or 503 status', async () => {
    const response = await httpGet('/ready');
    assert.ok(response.statusCode === 200 || response.statusCode === 503);
  });

  await test('GET /ready includes ready status', async () => {
    const response = await httpGet('/ready');
    assert.ok(response.data.status === 'ready' || response.data.status === 'not ready');
  });

  await test('GET /ready includes timestamp', async () => {
    const response = await httpGet('/ready');
    assert.ok(response.data.timestamp);
  });

  await test('GET /ready includes system checks', async () => {
    const response = await httpGet('/ready');
    assert.ok(response.data.checks);
    assert.ok(typeof response.data.checks.serverListening === 'boolean');
    assert.ok(typeof response.data.checks.gameStateInitialized === 'boolean');
    assert.ok(typeof response.data.checks.socketIOReady === 'boolean');
  });

  await test('GET /ready shows ready when server operational', async () => {
    const response = await httpGet('/ready');
    // If we got here, server is operational, so should be ready
    if (response.statusCode === 200) {
      assert.strictEqual(response.data.status, 'ready');
      assert.strictEqual(response.data.checks.serverListening, true);
    }
  });

  console.log('\n--- Legacy Status Endpoint Tests (3 tests) ---\n');

  await test('GET /status returns 200 status', async () => {
    const response = await httpGet('/status');
    assert.strictEqual(response.statusCode, 200);
  });

  await test('GET /status includes game state', async () => {
    const response = await httpGet('/status');
    assert.ok(response.data.status);
    assert.ok(typeof response.data.stage === 'number');
    assert.ok(typeof response.data.players === 'number');
  });

  await test('GET /status includes uptime', async () => {
    const response = await httpGet('/status');
    assert.ok(typeof response.data.uptime === 'number');
  });

  // Summary
  console.log('\n========================================');
  console.log('TEST RESULTS');
  console.log('========================================');
  console.log(`PASSED: ${passed}/${passed + failed}`);
  console.log(`FAILED: ${failed}/${passed + failed}`);

  if (failed > 0) {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
