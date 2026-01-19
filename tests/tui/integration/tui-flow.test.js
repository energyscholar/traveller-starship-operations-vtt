/**
 * TUI Flow Integration Tests
 * Tests for complete user flows through the TUI system
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

// Import all TUI modules to verify they can work together
const campaignMenu = require('../../../lib/tui/campaign-menu');
const operationsMenu = require('../../../lib/tui/operations-menu');
const emailMenu = require('../../../lib/tui/email-menu');
const npcMenu = require('../../../lib/tui/npc-menu');
const battleViewer = require('../../../lib/tui/battle-viewer');

// Import formatters
const travelFormatter = require('../../../lib/tui/formatters/travel-formatter');
const jumpFormatter = require('../../../lib/tui/formatters/jump-formatter');
const campaignFormatter = require('../../../lib/tui/formatters/campaign-formatter');
const fuelFormatter = require('../../../lib/tui/formatters/fuel-formatter');
const contactsFormatter = require('../../../lib/tui/formatters/contacts-formatter');
const timeFormatter = require('../../../lib/tui/formatters/time-formatter');
const emailFormatter = require('../../../lib/tui/formatters/email-formatter');
const npcFormatter = require('../../../lib/tui/formatters/npc-formatter');
const battleFormatter = require('../../../lib/tui/formatters/battle-formatter');

describe('TUI Flow Integration', () => {

  describe('Module Loading', () => {

    it('loads all menu modules without error', () => {
      assert.ok(campaignMenu, 'campaignMenu loaded');
      assert.ok(operationsMenu, 'operationsMenu loaded');
      assert.ok(emailMenu, 'emailMenu loaded');
      assert.ok(npcMenu, 'npcMenu loaded');
      assert.ok(battleViewer, 'battleViewer loaded');
    });

    it('loads all formatter modules without error', () => {
      assert.ok(travelFormatter, 'travelFormatter loaded');
      assert.ok(jumpFormatter, 'jumpFormatter loaded');
      assert.ok(campaignFormatter, 'campaignFormatter loaded');
      assert.ok(fuelFormatter, 'fuelFormatter loaded');
      assert.ok(contactsFormatter, 'contactsFormatter loaded');
      assert.ok(timeFormatter, 'timeFormatter loaded');
      assert.ok(emailFormatter, 'emailFormatter loaded');
      assert.ok(npcFormatter, 'npcFormatter loaded');
      assert.ok(battleFormatter, 'battleFormatter loaded');
    });
  });

  describe('Campaign → Operations Flow', () => {

    it('campaign formatter produces output for operations display', () => {
      const mockCampaign = {
        id: 'test-12345678',
        name: 'Test Campaign',
        current_system: 'Regina',
        current_date: '1105-001 08:00'
      };

      const campaignOutput = campaignFormatter.formatCampaignDetail(mockCampaign);
      assert.strictEqual(typeof campaignOutput, 'string');
      assert.ok(campaignOutput.length > 0);
    });

    it('ship formatter produces output for operations display', () => {
      const mockShip = {
        name: 'Aurora',
        ship_data: {
          type: 'Far Trader',
          tonnage: 200,
          jump: 2,
          thrust: 2
        }
      };

      const shipOutput = campaignFormatter.formatShipDetail(mockShip);
      assert.strictEqual(typeof shipOutput, 'string');
      assert.ok(shipOutput.includes('Aurora') || shipOutput.length > 0);
    });
  });

  describe('Operations → Travel Flow', () => {

    it('travel formatter shows current location', () => {
      const pilotState = {};
      const campaign = { current_system: 'Regina' };
      const ship = { name: 'Aurora' };

      const output = travelFormatter.formatTravelState(pilotState, campaign, ship);
      assert.ok(output.includes('Regina'), 'Should show current system');
    });

    it('travel formatter shows destination when set', () => {
      const pilotState = { destination: 'Efate' };
      const campaign = { current_system: 'Regina' };
      const ship = { name: 'Aurora' };

      const output = travelFormatter.formatTravelState(pilotState, campaign, ship);
      assert.ok(output.includes('Efate'), 'Should show destination');
    });

    it('jump formatter shows normal space status', () => {
      const jumpState = { inJump: false };
      const output = jumpFormatter.formatJumpState(jumpState);
      assert.ok(output.includes('Normal') || output.includes('space'));
    });

    it('jump formatter shows in-jump status', () => {
      const jumpState = { inJump: true, destination: 'Efate', daysRemaining: 5 };
      const output = jumpFormatter.formatJumpState(jumpState);
      assert.ok(output.includes('Efate') || output.includes('Jump') || output.includes('jump'));
    });
  });

  describe('Email Flow', () => {

    it('inbox formatter displays messages', () => {
      const messages = [
        { subject: 'Test Message', from: 'sender@test.com', read: false }
      ];

      const output = emailFormatter.formatInbox(messages);
      assert.strictEqual(typeof output, 'string');
      assert.ok(output.length > 0);
    });

    it('message formatter displays full message', () => {
      const message = {
        subject: 'Test Subject',
        from: 'sender@test.com',
        body: 'Test body content',
        date: '1105-001'
      };

      const output = emailFormatter.formatMessage(message);
      assert.ok(output.includes('Test') || output.length > 0);
    });
  });

  describe('NPC Flow', () => {

    it('NPC list formatter displays NPCs', () => {
      const npcs = [
        { name: 'Baron Harkon', role: 'Patron' }
      ];

      const output = npcFormatter.formatNPCList(npcs);
      assert.strictEqual(typeof output, 'string');
      assert.ok(output.length > 0);
    });

    it('NPC detail formatter displays full info', () => {
      const npc = {
        name: 'Baron Harkon',
        role: 'Patron',
        description: 'Wealthy noble seeking adventurers'
      };

      const output = npcFormatter.formatNPCDetail(npc);
      assert.ok(output.includes('Harkon') || output.includes('Patron'));
    });

    it('dialogue prompt formatter shows NPC name', () => {
      const npc = { name: 'Merchant Kira' };
      const output = npcFormatter.formatDialoguePrompt(npc);
      assert.ok(output.includes('KIRA') || output.includes('Kira'));
    });
  });

  describe('Battle Flow', () => {

    it('scenario list formatter displays scenarios', () => {
      const scenarios = [
        { name: 'Patrol Encounter', description: 'Standard patrol' }
      ];

      const output = battleFormatter.formatScenarioList(scenarios);
      assert.strictEqual(typeof output, 'string');
      assert.ok(output.length > 0);
    });

    it('battle result formatter displays outcome', () => {
      const result = {
        winner: 'Player',
        outcome: 'Victory',
        rounds: 5
      };

      const output = battleFormatter.formatBattleResult(result);
      assert.strictEqual(typeof output, 'string');
      assert.ok(output.length > 0);
    });
  });

  describe('Cross-Module Formatting', () => {

    it('all formatters return strings with consistent ANSI', () => {
      // Test that all formatters use ANSI codes consistently
      const outputs = [
        travelFormatter.formatTravelState({}, { current_system: 'Test' }, {}),
        jumpFormatter.formatJumpState({}),
        fuelFormatter.formatFuelState({ current: 20, capacity: 40 }, []),
        contactsFormatter.formatContactsList([]),
        timeFormatter.formatTimeState({}, {})
      ];

      outputs.forEach((output, idx) => {
        assert.ok(output.includes('\x1b['), `Formatter ${idx} should use ANSI codes`);
      });
    });

    it('brief formatters return compact output', () => {
      const briefOutputs = [
        travelFormatter.formatTravelBrief({}, { current_system: 'Test' }),
        jumpFormatter.formatJumpBrief({}),
        contactsFormatter.formatContactsBrief([])
      ];

      briefOutputs.forEach((output, idx) => {
        // Brief outputs should be shorter (single line typically)
        const lineCount = output.split('\n').length;
        assert.ok(lineCount <= 3, `Brief formatter ${idx} should be compact`);
      });
    });
  });
});
