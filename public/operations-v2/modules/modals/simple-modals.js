/**
 * V2 Simple Modals
 * Ported from V1: Time Advance, Add Log, Create Campaign, Confirmation
 */

(function(window) {
  'use strict';

  // ==================== Confirmation Modal ====================

  Modals.register('confirm', (context) => {
    const { title = 'Confirm', message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' } = context;

    return {
      title,
      size: 'small',
      content: `
        <p style="margin: 0 0 20px 0;">${message}</p>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">${cancelText}</button>
          <button class="btn btn-primary" data-action="confirm">${confirmText}</button>
        </div>
      `,
      onSetup: (modal) => {
        modal.querySelector('[data-action="confirm"]').addEventListener('click', () => {
          Modals.close();
          if (onConfirm) onConfirm();
        });
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
          Modals.close();
          if (onCancel) onCancel();
        });
      }
    };
  });

  // ==================== Alert Modal ====================

  Modals.register('alert', (context) => {
    const { title = 'Alert', message, onClose } = context;

    return {
      title,
      size: 'small',
      content: `
        <p style="margin: 0 0 20px 0;">${message}</p>
        <div class="button-row">
          <button class="btn btn-primary" data-action="ok">OK</button>
        </div>
      `,
      onSetup: (modal) => {
        modal.querySelector('[data-action="ok"]').addEventListener('click', () => {
          Modals.close();
          if (onClose) onClose();
        });
      }
    };
  });

  // ==================== Time Advance Modal ====================

  Modals.register('time-advance', (context) => {
    const { socket, shipId } = context;

    const advanceTime = (hours, minutes) => {
      socket.emit('ops:advanceTime', { shipId, hours, minutes });
    };

    return {
      title: 'Advance Time',
      size: 'medium',
      content: `
        <div class="quick-buttons">
          <button class="btn btn-secondary time-quick" data-hours="0" data-minutes="10">10 min</button>
          <button class="btn btn-secondary time-quick" data-hours="0" data-minutes="30">30 min</button>
          <button class="btn btn-secondary time-quick" data-hours="1" data-minutes="0">1 hour</button>
          <button class="btn btn-secondary time-quick" data-hours="4" data-minutes="0">4 hours</button>
          <button class="btn btn-secondary time-quick" data-hours="8" data-minutes="0">8 hours</button>
          <button class="btn btn-secondary time-quick" data-hours="24" data-minutes="0">1 day</button>
        </div>
        <div class="form-group">
          <label>Custom Time</label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="number" id="custom-hours" min="0" max="999" value="0" style="width: 80px;"> hours
            <input type="number" id="custom-minutes" min="0" max="59" value="0" style="width: 80px;"> minutes
          </div>
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" id="btn-custom-time">Advance</button>
        </div>
      `,
      onSetup: (modal) => {
        // Quick time buttons
        modal.querySelectorAll('.time-quick').forEach(btn => {
          btn.addEventListener('click', () => {
            const hours = parseInt(btn.dataset.hours) || 0;
            const minutes = parseInt(btn.dataset.minutes) || 0;
            advanceTime(hours, minutes);
            Modals.close();
          });
        });

        // Custom time
        modal.querySelector('#btn-custom-time').addEventListener('click', () => {
          const hours = parseInt(modal.querySelector('#custom-hours').value) || 0;
          const minutes = parseInt(modal.querySelector('#custom-minutes').value) || 0;
          if (hours > 0 || minutes > 0) {
            advanceTime(hours, minutes);
            Modals.close();
          }
        });

        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());
      }
    };
  });

  // ==================== Add Log Entry Modal ====================

  Modals.register('add-log', (context) => {
    const { socket, shipId } = context;

    return {
      title: 'Add Ship Log Entry',
      size: 'medium',
      content: `
        <div class="form-group">
          <label for="log-entry-type">Entry Type</label>
          <select id="log-entry-type">
            <option value="general">General</option>
            <option value="navigation">Navigation</option>
            <option value="engineering">Engineering</option>
            <option value="tactical">Tactical</option>
            <option value="medical">Medical</option>
            <option value="cargo">Cargo</option>
          </select>
        </div>
        <div class="form-group">
          <label for="log-entry-message">Log Entry</label>
          <textarea id="log-entry-message" rows="4" placeholder="Enter log entry..."></textarea>
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="save">Save Entry</button>
        </div>
      `,
      onSetup: (modal) => {
        modal.querySelector('[data-action="save"]').addEventListener('click', () => {
          const entryType = modal.querySelector('#log-entry-type').value;
          const message = modal.querySelector('#log-entry-message').value.trim();
          if (message) {
            socket.emit('ops:addLogEntry', { shipId, entryType, message });
            Modals.close();
          }
        });
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());
      }
    };
  });

  // ==================== Create Campaign Modal ====================

  Modals.register('create-campaign', (context) => {
    const { socket } = context;

    return {
      title: 'Create New Campaign',
      size: 'medium',
      content: `
        <div class="form-group">
          <label for="new-campaign-name">Campaign Name</label>
          <input type="text" id="new-campaign-name" placeholder="Enter campaign name">
        </div>
        <div class="form-group">
          <label for="gm-name">GM Name</label>
          <input type="text" id="gm-name" placeholder="Enter your name">
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="create">Create Campaign</button>
        </div>
      `,
      onSetup: (modal) => {
        const create = () => {
          const name = modal.querySelector('#new-campaign-name').value.trim();
          const gmName = modal.querySelector('#gm-name').value.trim();
          if (name && gmName) {
            socket.emit('ops:createCampaign', { name, gmName });
            Modals.close();
          }
        };

        modal.querySelector('[data-action="create"]').addEventListener('click', create);
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => Modals.close());

        // Enter key support
        ['new-campaign-name', 'gm-name'].forEach(id => {
          modal.querySelector(`#${id}`).addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
          });
        });
      }
    };
  });

  // ==================== Input Prompt Modal ====================

  Modals.register('input', (context) => {
    const { title = 'Input', label, placeholder = '', defaultValue = '', onSubmit, onCancel } = context;

    return {
      title,
      size: 'small',
      content: `
        <div class="form-group">
          <label for="input-value">${label}</label>
          <input type="text" id="input-value" placeholder="${placeholder}" value="${defaultValue}">
        </div>
        <div class="button-row">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="submit">OK</button>
        </div>
      `,
      onSetup: (modal) => {
        const submit = () => {
          const value = modal.querySelector('#input-value').value.trim();
          Modals.close();
          if (onSubmit) onSubmit(value);
        };

        modal.querySelector('[data-action="submit"]').addEventListener('click', submit);
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
          Modals.close();
          if (onCancel) onCancel();
        });
        modal.querySelector('#input-value').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        });
      }
    };
  });

})(window);
