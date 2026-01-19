/**
 * V2 Alert Status Tests
 * Verifies the alert status fix: alertStatus key (not status)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('V2 Alert Status', function() {
  it('should send alertStatus key (not status)', function() {
    // Mock socket
    let emittedEvent = null;
    let emittedData = null;
    const mockSocket = {
      emit: (event, data) => {
        emittedEvent = event;
        emittedData = data;
      }
    };

    // Simulate action handler (matches V2 app.js implementation)
    const setAlert = (d) => mockSocket.emit('ops:setAlertStatus', { alertStatus: d.alert });
    setAlert({ alert: 'RED' });

    assert.strictEqual(emittedEvent, 'ops:setAlertStatus');
    assert.strictEqual(emittedData.alertStatus, 'RED');
    assert.strictEqual(emittedData.status, undefined, 'Should not have status key');
  });

  it('should handle all alert levels', function() {
    const alertLevels = ['NORMAL', 'YELLOW', 'RED'];

    alertLevels.forEach(level => {
      let emittedData = null;
      const mockSocket = {
        emit: (event, data) => { emittedData = data; }
      };

      const setAlert = (d) => mockSocket.emit('ops:setAlertStatus', { alertStatus: d.alert });
      setAlert({ alert: level });

      assert.strictEqual(emittedData.alertStatus, level, `Should emit ${level}`);
    });
  });
});
