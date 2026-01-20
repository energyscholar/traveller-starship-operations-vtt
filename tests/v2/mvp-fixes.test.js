/**
 * V2 MVP Fixes Verification Tests
 * Run after Generator completes .claude/plans/V2-MVP-FIXES.md
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('V2 MVP Fixes Verification', function() {

  describe('TASK 1: Role Selection Event Delegation', function() {
    it('should use event delegation on container (not individual elements)', function() {
      const filePath = path.join(__dirname, '../../public/operations/renderers/setup-renderers.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Should have container.addEventListener pattern
      assert.match(content, /container\.addEventListener\s*\(\s*['"]click['"]/,
        'Should use event delegation on container');

      // Should use closest() to find role-option
      assert.match(content, /\.closest\s*\(\s*['"]\.role-option/,
        'Should use closest() to find clicked role option');
    });
  });

  describe('TASK 2: Combat Access in Hamburger Menu', function() {
    it('should have GM Controls section in HTML', function() {
      const filePath = path.join(__dirname, '../../public/operations/index.html');
      const content = fs.readFileSync(filePath, 'utf8');

      assert.match(content, /gm-menu-section/,
        'Should have gm-menu-section element');
      assert.match(content, /data-feature=["']enter-combat["']/,
        'Should have enter-combat feature button');
      assert.match(content, /data-feature=["']load-drill["']/,
        'Should have load-drill feature button');
    });

    it('should handle enter-combat in hamburger menu', function() {
      const filePath = path.join(__dirname, '../../public/operations/modules/hamburger-menu.js');
      const content = fs.readFileSync(filePath, 'utf8');

      assert.match(content, /case\s+['"]enter-combat['"]/,
        'Should handle enter-combat case');
      assert.match(content, /ops:enterCombat/,
        'Should emit ops:enterCombat');
    });

    it('should show GM section only for GMs', function() {
      const filePath = path.join(__dirname, '../../public/operations/modules/hamburger-menu.js');
      const content = fs.readFileSync(filePath, 'utf8');

      assert.match(content, /gm-menu-section/,
        'Should reference gm-menu-section');
      assert.match(content, /state\.isGM/,
        'Should check state.isGM for visibility');
    });
  });

  describe('TASK 3: Alert Status FK Guard', function() {
    it('should guard addLogEntry with ID checks', function() {
      const filePath = path.join(__dirname, '../../lib/socket-handlers/ops/bridge.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Find the setAlertStatus handler section
      const alertSection = content.match(/socket\.on\(['"]ops:setAlertStatus['"][\s\S]*?(?=socket\.on|module\.exports)/);
      assert.ok(alertSection, 'Should have setAlertStatus handler');

      const handler = alertSection[0];

      // Should check IDs before logging
      assert.match(handler, /opsSession\.shipId\s*&&\s*opsSession\.campaignId|opsSession\.campaignId\s*&&\s*opsSession\.shipId/,
        'Should check both shipId and campaignId before logging');
    });

    it('should emit alertStatusChanged before logging', function() {
      const filePath = path.join(__dirname, '../../lib/socket-handlers/ops/bridge.js');
      const content = fs.readFileSync(filePath, 'utf8');

      // Find positions
      const emitPos = content.indexOf("emit('ops:alertStatusChanged'");
      const addLogPos = content.indexOf('addLogEntry', content.indexOf('setAlertStatus'));

      assert.ok(emitPos > 0, 'Should have alertStatusChanged emit');
      assert.ok(addLogPos > 0, 'Should have addLogEntry call');
      assert.ok(emitPos < addLogPos, 'Should emit BEFORE logging');
    });
  });

  describe('TASK 4: Campaign List Population', function() {
    it('should have campaign list handler', function() {
      const filePath = path.join(__dirname, '../../public/operations/screens/login-screen.js');
      const content = fs.readFileSync(filePath, 'utf8');

      assert.match(content, /ops:campaigns/,
        'Should listen for ops:campaigns event');
      assert.match(content, /campaign-codes-list/,
        'Should reference campaign-codes-list element');
    });
  });

});

// Summary helper
describe('Summary', function() {
  it('all fixes should be in place', function() {
    console.log('\n=== V2 MVP Fixes Verification ===');
    console.log('Run: npm run start:fresh');
    console.log('Then manually test:');
    console.log('  1. Player login → role selection clicks');
    console.log('  2. GM login → hamburger menu → GM Controls');
    console.log('  3. GM → change alert status → no FK error');
    console.log('  4. Player login → campaign codes appear');
    console.log('=====================================\n');
  });
});
