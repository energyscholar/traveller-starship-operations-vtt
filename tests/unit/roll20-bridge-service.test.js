/**
 * Roll20 Bridge Service Tests
 */
const { expect } = require('chai');
const WebSocket = require('ws');

describe('Roll20 Bridge Service', function() {
  this.timeout(5000);

  let BridgeService;

  before(function() {
    // Require the bridge service module
    BridgeService = require('../../roll20-bridge-service/bridge-service');
  });

  describe('WebSocket Server', function() {
    it('should start on port 3001', function(done) {
      const bridge = new BridgeService({ vttPort: 3000 });
      bridge.start().then(() => {
        expect(bridge.isListening()).to.be.true;
        expect(bridge.getPort()).to.equal(3001);
        bridge.stop();
        done();
      });
    });

    it('should accept WebSocket connections', function(done) {
      const bridge = new BridgeService({ vttPort: 3000 });
      bridge.start().then(() => {
        const client = new WebSocket('ws://localhost:3001/roll20');
        client.on('open', () => {
          expect(bridge.getClientCount()).to.equal(1);
          client.close();
          bridge.stop();
          done();
        });
      });
    });

    it('should handle multiple clients', function(done) {
      const bridge = new BridgeService({ vttPort: 3000 });
      bridge.start().then(() => {
        const client1 = new WebSocket('ws://localhost:3001/roll20');
        const client2 = new WebSocket('ws://localhost:3001/roll20');
        let connected = 0;

        const onOpen = () => {
          connected++;
          if (connected === 2) {
            expect(bridge.getClientCount()).to.equal(2);
            client1.close();
            client2.close();
            bridge.stop();
            done();
          }
        };

        client1.on('open', onOpen);
        client2.on('open', onOpen);
      });
    });
  });

  describe('Message Routing', function() {
    it('should broadcast SEND_CHAT to all WebSocket clients', function(done) {
      const bridge = new BridgeService({ vttPort: 3000 });
      bridge.start().then(() => {
        const client = new WebSocket('ws://localhost:3001/roll20');

        client.on('message', (data) => {
          const msg = JSON.parse(data);
          expect(msg.type).to.equal('SEND_CHAT');
          expect(msg.text).to.include('Test Roll');
          client.close();
          bridge.stop();
          done();
        });

        client.on('open', () => {
          // Simulate VTT sending a roll
          bridge.handleVttRoll({
            roller: 'Gunner',
            action: 'Test Roll',
            dice: [3, 4],
            total: 7,
            modifier: 2,
            result: 9,
            target: 8,
            success: true
          });
        });
      });
    });
  });
});
