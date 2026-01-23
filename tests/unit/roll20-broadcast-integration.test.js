/**
 * Roll20 Broadcast Integration Tests
 */
const { expect } = require('chai');
const sinon = require('sinon');
const { broadcastRollResult } = require('../../lib/socket-handlers/roll-broadcast');

describe('Roll20 Broadcast Integration', function() {
  let mockIo;
  let mockBridge;

  beforeEach(function() {
    mockIo = {
      to: sinon.stub().returns({
        emit: sinon.stub()
      })
    };

    // Mock the bridge emitter (injected dependency)
    mockBridge = {
      sendRoll: sinon.stub()
    };
  });

  describe('broadcastRollResult with bridge', function() {
    it('should emit to campaign room', function() {
      broadcastRollResult(mockIo, 'test-campaign', {
        roller: 'Gunner',
        action: 'Attack',
        dice: [3, 4],
        total: 7,
        modifier: 2,
        result: 9,
        target: 8,
        success: true
      });

      expect(mockIo.to.calledWith('campaign:test-campaign')).to.be.true;
      expect(mockIo.to().emit.calledWith('comms:newTransmission')).to.be.true;
    });

    it('should emit to roll20 bridge when available', function() {
      // This tests the new bridge integration
      broadcastRollResult(mockIo, 'test-campaign', {
        roller: 'Gunner',
        action: 'Attack',
        dice: [3, 4],
        total: 7,
        modifier: 2,
        result: 9,
        target: 8,
        success: true
      }, mockBridge);  // Pass bridge as optional param

      expect(mockBridge.sendRoll.called).to.be.true;
    });

    it('should not fail if bridge unavailable', function() {
      // Should not throw when bridge is null/undefined
      expect(() => {
        broadcastRollResult(mockIo, 'test-campaign', {
          roller: 'Gunner',
          action: 'Attack',
          dice: [3, 4],
          total: 7,
          modifier: 2,
          result: 9,
          target: 8,
          success: true
        }, null);
      }).to.not.throw();
    });
  });
});
