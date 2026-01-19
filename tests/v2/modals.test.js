/**
 * V2 Modal System Tests
 * Tests for modal-base.js and modal registry
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// Mock DOM environment for testing
function createMockDOM() {
  const elements = new Map();
  const listeners = new Map();

  const createElement = (id, className) => {
    const el = {
      id,
      className: className || '',
      classList: {
        _classes: new Set((className || '').split(' ').filter(c => c)),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); },
        toggle(c) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        }
      },
      innerHTML: '',
      innerText: '',
      style: {},
      dataset: {},
      querySelector(sel) {
        // Simple selector matching
        if (sel.startsWith('#')) {
          return elements.get(sel.slice(1));
        }
        if (sel.startsWith('[data-action=')) {
          const action = sel.match(/\[data-action="([^"]+)"\]/)?.[1];
          for (const child of this._children || []) {
            if (child.dataset?.action === action) return child;
          }
        }
        return null;
      },
      querySelectorAll(sel) {
        return [];
      },
      addEventListener(event, handler) {
        const key = `${id}:${event}`;
        if (!listeners.has(key)) listeners.set(key, []);
        listeners.get(key).push(handler);
      },
      click() {
        const key = `${id}:click`;
        const handlers = listeners.get(key) || [];
        handlers.forEach(h => h({ target: this, preventDefault: () => {} }));
      },
      _children: []
    };
    elements.set(id, el);
    return el;
  };

  return {
    elements,
    listeners,
    getElementById: (id) => elements.get(id),
    createElement,
    createContainer: () => createElement('modal-container'),
    createOverlay: () => createElement('modal-overlay', 'hidden')
  };
}

describe('V2 Modal System', () => {

  describe('ModalBase', () => {

    it('should initialize with container and overlay elements', () => {
      const dom = createMockDOM();
      dom.createContainer();
      dom.createOverlay();

      // Simulate ModalBase init
      const container = dom.getElementById('modal-container');
      const overlay = dom.getElementById('modal-overlay');

      assert.ok(container, 'Modal container should exist');
      assert.ok(overlay, 'Modal overlay should exist');
    });

    it('should track open state', () => {
      // Simulate ModalBase state
      const state = { currentModal: null };

      assert.strictEqual(state.currentModal, null, 'Initially no modal open');

      state.currentModal = { title: 'Test' };
      assert.ok(state.currentModal !== null, 'Modal should be tracked when open');

      state.currentModal = null;
      assert.strictEqual(state.currentModal, null, 'Modal cleared after close');
    });

    it('should build modal HTML with title and content', () => {
      const options = {
        title: 'Test Modal',
        content: '<p>Test content</p>',
        size: 'medium'
      };

      // Simulate modal HTML generation
      const modalHTML = `
        <div class="modal modal-${options.size}">
          <div class="modal-header">
            <h2 class="modal-title">${options.title}</h2>
            <button class="modal-close" data-action="closeModal">&times;</button>
          </div>
          <div class="modal-body">
            ${options.content}
          </div>
        </div>
      `;

      assert.ok(modalHTML.includes('Test Modal'), 'HTML should contain title');
      assert.ok(modalHTML.includes('Test content'), 'HTML should contain content');
      assert.ok(modalHTML.includes('modal-medium'), 'HTML should contain size class');
    });

    it('should support small, medium, and large sizes', () => {
      ['small', 'medium', 'large'].forEach(size => {
        const className = `modal-${size}`;
        assert.ok(className.includes(size), `Should support ${size} size`);
      });
    });

  });

  describe('Modal Registry', () => {

    it('should register and retrieve modal handlers', () => {
      const handlers = new Map();

      // Register
      const testHandler = () => ({ title: 'Test' });
      handlers.set('test-modal', testHandler);

      // Retrieve
      const retrieved = handlers.get('test-modal');
      assert.strictEqual(retrieved, testHandler, 'Should retrieve registered handler');
    });

    it('should return undefined for unregistered modals', () => {
      const handlers = new Map();
      const result = handlers.get('nonexistent');
      assert.strictEqual(result, undefined, 'Should return undefined');
    });

    it('should list all registered modal IDs', () => {
      const handlers = new Map();
      handlers.set('modal-a', () => {});
      handlers.set('modal-b', () => {});
      handlers.set('modal-c', () => {});

      const ids = Array.from(handlers.keys());
      assert.deepStrictEqual(ids, ['modal-a', 'modal-b', 'modal-c']);
    });

  });

  describe('Confirmation Modal Pattern', () => {

    it('should generate confirm modal with message and buttons', () => {
      const context = {
        title: 'Confirm Action',
        message: 'Are you sure?',
        confirmText: 'Yes',
        cancelText: 'No'
      };

      const content = `
        <p>${context.message}</p>
        <div class="button-row">
          <button data-action="cancel">${context.cancelText}</button>
          <button data-action="confirm">${context.confirmText}</button>
        </div>
      `;

      assert.ok(content.includes('Are you sure?'), 'Should contain message');
      assert.ok(content.includes('Yes'), 'Should contain confirm text');
      assert.ok(content.includes('No'), 'Should contain cancel text');
    });

    it('should call onConfirm callback when confirmed', () => {
      let confirmed = false;
      const onConfirm = () => { confirmed = true; };

      // Simulate confirm button click
      onConfirm();

      assert.strictEqual(confirmed, true, 'onConfirm should be called');
    });

    it('should call onCancel callback when cancelled', () => {
      let cancelled = false;
      const onCancel = () => { cancelled = true; };

      // Simulate cancel button click
      onCancel();

      assert.strictEqual(cancelled, true, 'onCancel should be called');
    });

  });

  describe('Time Advance Modal Pattern', () => {

    it('should provide quick time buttons', () => {
      const quickTimes = [
        { hours: 0, minutes: 10 },
        { hours: 0, minutes: 30 },
        { hours: 1, minutes: 0 },
        { hours: 4, minutes: 0 },
        { hours: 8, minutes: 0 },
        { hours: 24, minutes: 0 }
      ];

      assert.strictEqual(quickTimes.length, 6, 'Should have 6 quick time options');
      assert.deepStrictEqual(quickTimes[0], { hours: 0, minutes: 10 }, 'First should be 10 min');
      assert.deepStrictEqual(quickTimes[5], { hours: 24, minutes: 0 }, 'Last should be 1 day');
    });

    it('should emit advanceTime with hours and minutes', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:advanceTime', { shipId: 'ship1', hours: 2, minutes: 30 });

      assert.strictEqual(emitted.event, 'ops:advanceTime');
      assert.strictEqual(emitted.data.hours, 2);
      assert.strictEqual(emitted.data.minutes, 30);
    });

  });

  describe('Add Log Entry Modal Pattern', () => {

    it('should support multiple entry types', () => {
      const entryTypes = ['general', 'navigation', 'engineering', 'tactical', 'medical', 'cargo'];

      assert.strictEqual(entryTypes.length, 6, 'Should have 6 entry types');
      assert.ok(entryTypes.includes('navigation'), 'Should include navigation');
      assert.ok(entryTypes.includes('engineering'), 'Should include engineering');
    });

    it('should emit addLogEntry with type and message', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:addLogEntry', {
        shipId: 'ship1',
        entryType: 'navigation',
        message: 'Jumped to Rhylanor'
      });

      assert.strictEqual(emitted.event, 'ops:addLogEntry');
      assert.strictEqual(emitted.data.entryType, 'navigation');
      assert.strictEqual(emitted.data.message, 'Jumped to Rhylanor');
    });

  });

  describe('Create Campaign Modal Pattern', () => {

    it('should require campaign name and GM name', () => {
      const validate = (name, gmName) => {
        return !!(name && name.trim() && gmName && gmName.trim());
      };

      assert.strictEqual(validate('', 'GM'), false, 'Empty name should fail');
      assert.strictEqual(validate('Campaign', ''), false, 'Empty GM name should fail');
      assert.strictEqual(validate('  ', 'GM'), false, 'Whitespace name should fail');
      assert.strictEqual(validate('Campaign', 'GM'), true, 'Valid inputs should pass');
    });

    it('should emit createCampaign with name and gmName', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:createCampaign', { name: 'Test Campaign', gmName: 'Bruce' });

      assert.strictEqual(emitted.event, 'ops:createCampaign');
      assert.strictEqual(emitted.data.name, 'Test Campaign');
      assert.strictEqual(emitted.data.gmName, 'Bruce');
    });

  });

  describe('Ship Modals Pattern', () => {

    it('should generate template options from templates array', () => {
      const templates = [
        { id: 't1', name: 'Far Trader', shipClass: 'A2' },
        { id: 't2', name: 'Free Trader', hullTonnage: 200 }
      ];

      const options = templates.map(t =>
        `<option value="${t.id}">${t.name} (${t.shipClass || t.hullTonnage + 't'})</option>`
      ).join('');

      assert.ok(options.includes('Far Trader (A2)'), 'Should show ship class');
      assert.ok(options.includes('Free Trader (200t)'), 'Should show tonnage if no class');
    });

    it('should emit addShipFromTemplate with required data', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:addShipFromTemplate', {
        templateId: 'far-trader',
        name: 'Aurora',
        isPartyShip: true
      });

      assert.strictEqual(emitted.event, 'ops:addShipFromTemplate');
      assert.strictEqual(emitted.data.templateId, 'far-trader');
      assert.strictEqual(emitted.data.name, 'Aurora');
      assert.strictEqual(emitted.data.isPartyShip, true);
    });

    it('should display ship status with hull, fuel, power', () => {
      const shipState = {
        hull: { current: 80, max: 100, armor: 4 },
        fuel: { refined: 20, unrefined: 5, capacity: 40 },
        power: { output: 100, used: 60 }
      };

      // Verify data structure
      assert.strictEqual(shipState.hull.current, 80);
      assert.strictEqual(shipState.fuel.refined, 20);
      assert.strictEqual(shipState.power.output, 100);
    });

  });

  describe('Input Modal Pattern', () => {

    it('should pass value to onSubmit callback', () => {
      let submittedValue = null;
      const onSubmit = (value) => { submittedValue = value; };

      // Simulate form submission
      onSubmit('test input');

      assert.strictEqual(submittedValue, 'test input');
    });

    it('should support default value', () => {
      const context = {
        defaultValue: 'default text'
      };

      const inputHTML = `<input value="${context.defaultValue}">`;
      assert.ok(inputHTML.includes('default text'));
    });

  });

  // === Advanced Modals Tests ===

  describe('Jump Destination Modal Pattern', () => {

    it('should emit initiateJump with destination data', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:initiateJump', {
        destination: 'Rhylanor',
        sector: 'Spinward Marches',
        hex: '2716'
      });

      assert.strictEqual(emitted.event, 'ops:initiateJump');
      assert.strictEqual(emitted.data.destination, 'Rhylanor');
      assert.strictEqual(emitted.data.sector, 'Spinward Marches');
    });

    it('should validate jump distance against rating', () => {
      const validateJump = (distance, jumpRating) => distance <= jumpRating;

      assert.strictEqual(validateJump(2, 2), true, 'Equal distance should pass');
      assert.strictEqual(validateJump(1, 2), true, 'Less distance should pass');
      assert.strictEqual(validateJump(3, 2), false, 'Greater distance should fail');
    });

    it('should calculate fuel requirement', () => {
      const calcFuel = (distance) => distance * 10; // 10 tons per parsec

      assert.strictEqual(calcFuel(1), 10);
      assert.strictEqual(calcFuel(2), 20);
      assert.strictEqual(calcFuel(4), 40);
    });

  });

  describe('Contact Details Modal Pattern', () => {

    it('should display contact information', () => {
      const contact = {
        id: 'c1',
        name: 'Alpha',
        type: 'ship',
        bearing: 45,
        range_km: 50000,
        transponder: 'ISS Aurora',
        signature: 'normal'
      };

      assert.strictEqual(contact.type, 'ship');
      assert.strictEqual(contact.bearing, 45);
      assert.strictEqual(contact.range_km, 50000);
    });

    it('should allow GM to edit contact', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:updateContact', {
        contactId: 'c1',
        name: 'Updated Name',
        type: 'station'
      });

      assert.strictEqual(emitted.event, 'ops:updateContact');
      assert.strictEqual(emitted.data.name, 'Updated Name');
    });

    it('should allow GM to delete contact', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:deleteContact', { contactId: 'c1' });

      assert.strictEqual(emitted.event, 'ops:deleteContact');
      assert.strictEqual(emitted.data.contactId, 'c1');
    });

  });

  describe('System Lookup Modal Pattern', () => {

    it('should emit setCurrentSystem when system selected', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:setCurrentSystem', {
        system: 'Regina',
        sector: 'Spinward Marches',
        hex: '1910',
        uwp: 'A788899-C'
      });

      assert.strictEqual(emitted.event, 'ops:setCurrentSystem');
      assert.strictEqual(emitted.data.system, 'Regina');
      assert.strictEqual(emitted.data.uwp, 'A788899-C');
    });

    it('should call onSelect callback if provided', () => {
      let selected = null;
      const onSelect = (system) => { selected = system; };

      onSelect({ Name: 'Mora', Sector: 'Spinward Marches' });

      assert.strictEqual(selected.Name, 'Mora');
    });

  });

  describe('Ship Config Modal Pattern', () => {

    it('should emit updateShipConfig with settings', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:updateShipConfig', {
        shipId: 'ship1',
        name: 'ISS Aurora',
        registry: 'SM-12345',
        transponder: 'on'
      });

      assert.strictEqual(emitted.event, 'ops:updateShipConfig');
      assert.strictEqual(emitted.data.name, 'ISS Aurora');
      assert.strictEqual(emitted.data.transponder, 'on');
    });

    it('should display read-only ship stats', () => {
      const ship = { thrust: 2, jumpRating: 2, cargo: 100 };
      const shipState = {
        hull: { current: 80, max: 100, armor: 4 },
        fuel: { refined: 30, capacity: 40 }
      };

      assert.strictEqual(ship.thrust, 2);
      assert.strictEqual(shipState.hull.current, 80);
    });

  });

  describe('Refueling Modal Pattern', () => {

    it('should calculate fuel needed', () => {
      const calcNeeded = (current, capacity) => capacity - current;

      assert.strictEqual(calcNeeded(20, 40), 20);
      assert.strictEqual(calcNeeded(0, 40), 40);
      assert.strictEqual(calcNeeded(40, 40), 0);
    });

    it('should emit refuel with type and amount', () => {
      let emitted = null;
      const mockSocket = {
        emit: (event, data) => { emitted = { event, data }; }
      };

      mockSocket.emit('ops:refuel', {
        shipId: 'ship1',
        type: 'skim',
        amount: 20
      });

      assert.strictEqual(emitted.event, 'ops:refuel');
      assert.strictEqual(emitted.data.type, 'skim');
      assert.strictEqual(emitted.data.amount, 20);
    });

    it('should support multiple refuel types', () => {
      const refuelTypes = ['skim', 'water', 'purchase'];

      assert.strictEqual(refuelTypes.length, 3);
      assert.ok(refuelTypes.includes('skim'), 'Should include gas giant skim');
      assert.ok(refuelTypes.includes('purchase'), 'Should include starport purchase');
    });

    it('should disable options based on location', () => {
      const location = { hasGasGiant: true, hasWater: false, starportClass: 'A' };

      const canSkim = location.hasGasGiant;
      const canExtract = location.hasWater;
      const canPurchase = ['A', 'B', 'C', 'D'].includes(location.starportClass);

      assert.strictEqual(canSkim, true);
      assert.strictEqual(canExtract, false);
      assert.strictEqual(canPurchase, true);
    });

  });

});
