/**
 * Comms ViewModel
 * Provides display-ready data for communications role.
 * @module lib/viewmodels/role-viewmodels/comms-viewmodel
 */

const { createViewModel, createAction } = require('../base-viewmodel');

function createCommsViewModel(shipState, messages = [], channels = {}) {
  const unread = messages.filter(m => !m.read);
  const priority = messages.filter(m => m.priority === 'high' || m.priority === 'urgent');
  const jamming = channels.jammed || false;

  const state = {
    messages: {
      total: messages.length,
      unread: unread.length,
      priority: priority.length
    },
    channels: {
      open: channels.open || [],
      jammed: jamming,
      encrypted: channels.encrypted || false
    }
  };

  const derived = {
    statusBadge: jamming ? 'JAMMED' : priority.length > 0 ? 'PRIORITY' : unread.length > 0 ? 'MESSAGES' : 'CLEAR',
    statusClass: jamming ? 'jammed' : priority.length > 0 ? 'priority' : unread.length > 0 ? 'messages' : 'clear',
    unreadCountText: `${unread.length} unread`,
    priorityCountText: `${priority.length} priority`
  };

  const actions = {
    send: createAction(!jamming, jamming ? 'Comms jammed' : null),
    hail: createAction(!jamming, jamming ? 'Comms jammed' : null),
    encrypt: createAction(true, null),
    jamCountermeasures: createAction(jamming, jamming ? null : 'No jamming detected')
  };

  return createViewModel('comms', state, derived, actions);
}

module.exports = { createCommsViewModel };
