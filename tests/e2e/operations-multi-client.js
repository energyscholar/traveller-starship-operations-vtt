/**
 * PUP-A2: Multi-client Puppeteer Test Harness for Operations VTT
 *
 * Provides helpers for spawning multiple browser instances and testing
 * real-time collaboration features like crew status updates.
 *
 * Usage:
 *   const { OpsTestHarness, launchClient } = require('./operations-multi-client');
 *   const harness = new OpsTestHarness();
 *   await harness.start();
 *   const gm = await harness.addGM('TestGM');
 *   const player = await harness.addPlayer('Asao');
 *   // ... run tests ...
 *   await harness.stop();
 */

const puppeteer = require('puppeteer');
const io = require('socket.io-client');

const DEFAULT_PORT = 3000;
const DEFAULT_URL = `http://localhost:${DEFAULT_PORT}/operations/`;

// Test key for puppeteer auth
const PUPPETEER_TEST_KEY = 'puppeteer-test-key-12345';

/**
 * Single client wrapper
 */
class OpsClient {
  constructor(name, role, harness) {
    this.name = name;
    this.role = role;
    this.harness = harness;
    this.browser = null;
    this.page = null;
    this.socket = null;
    this.events = [];
  }

  async launch() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    await this.page.goto(DEFAULT_URL);

    // Wait for socket connection
    await this.page.waitForFunction(() => {
      return window.state && window.state.socket && window.state.socket.connected;
    }, { timeout: 10000 });

    return this;
  }

  async authenticate(campaignId = null) {
    // Use puppeteer auth socket event
    const socket = io(DEFAULT_URL.replace('/operations/', ''), {
      transports: ['websocket']
    });

    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('ops:puppeteerAuth', {
          testKey: PUPPETEER_TEST_KEY,
          clientName: this.name,
          requestedRole: this.role,
          campaignId
        });
      });

      socket.on('ops:puppeteerAuthSuccess', (data) => {
        this.socket = socket;
        resolve(data);
      });

      socket.on('ops:error', (error) => {
        reject(new Error(error.message));
      });

      setTimeout(() => reject(new Error('Auth timeout')), 5000);
    });
  }

  async selectCampaign(campaignId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('ops:selectCampaign', { campaignId });
      this.socket.once('ops:campaignSelected', resolve);
      this.socket.once('ops:error', reject);
      setTimeout(() => reject(new Error('Select campaign timeout')), 5000);
    });
  }

  async selectSlot(slotName) {
    return new Promise((resolve, reject) => {
      this.socket.emit('ops:selectPlayerSlot', { slotName });
      this.socket.once('ops:slotSelected', resolve);
      this.socket.once('ops:error', reject);
      setTimeout(() => reject(new Error('Select slot timeout')), 5000);
    });
  }

  async selectShip(shipId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('ops:selectShip', { shipId });
      this.socket.once('ops:shipSelected', resolve);
      this.socket.once('ops:error', reject);
      setTimeout(() => reject(new Error('Select ship timeout')), 5000);
    });
  }

  async assignRole(role, roleInstance = 1) {
    return new Promise((resolve, reject) => {
      this.socket.emit('ops:assignRole', { role, roleInstance });
      this.socket.once('ops:roleAssigned', resolve);
      this.socket.once('ops:error', reject);
      setTimeout(() => reject(new Error('Assign role timeout')), 5000);
    });
  }

  async joinBridge(options = {}) {
    return new Promise((resolve, reject) => {
      this.socket.emit('ops:joinBridge', options);
      this.socket.once('ops:bridgeJoined', resolve);
      this.socket.once('ops:error', reject);
      setTimeout(() => reject(new Error('Join bridge timeout')), 5000);
    });
  }

  async waitForEvent(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const handler = (data) => {
        this.events.push({ event: eventName, data, time: Date.now() });
        resolve(data);
      };
      this.socket.once(eventName, handler);
      setTimeout(() => {
        this.socket.off(eventName, handler);
        reject(new Error(`Timeout waiting for ${eventName}`));
      }, timeout);
    });
  }

  async getServerState() {
    return new Promise((resolve, reject) => {
      this.socket.emit('ops:puppeteerGetState', {
        testKey: PUPPETEER_TEST_KEY
      });
      this.socket.once('ops:puppeteerState', resolve);
      this.socket.once('ops:error', reject);
      setTimeout(() => reject(new Error('Get state timeout')), 5000);
    });
  }

  async close() {
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

/**
 * Test harness for managing multiple clients
 */
class OpsTestHarness {
  constructor(baseUrl = DEFAULT_URL) {
    this.baseUrl = baseUrl;
    this.clients = [];
    this.gm = null;
    this.campaignId = null;
  }

  async addClient(name, role = 'player') {
    const client = new OpsClient(name, role, this);
    this.clients.push(client);
    return client;
  }

  async addGM(name = 'TestGM') {
    const gm = await this.addClient(name, 'gm');
    await gm.authenticate();
    this.gm = gm;
    return gm;
  }

  async addPlayer(name, slotName = null) {
    const player = await this.addClient(name, 'player');
    await player.authenticate(this.campaignId);
    if (slotName) {
      await player.selectSlot(slotName);
    }
    return player;
  }

  async stop() {
    for (const client of this.clients) {
      await client.close();
    }
    this.clients = [];
    this.gm = null;
  }
}

/**
 * Quick launch helper for single client tests
 */
async function launchClient(name = 'TestClient', role = 'player') {
  const client = new OpsClient(name, role, null);
  await client.launch();
  await client.authenticate();
  return client;
}

// Export for use in tests
module.exports = {
  OpsTestHarness,
  OpsClient,
  launchClient,
  PUPPETEER_TEST_KEY,
  DEFAULT_URL
};
