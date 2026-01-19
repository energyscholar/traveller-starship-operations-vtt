/**
 * Steward ViewModel
 * Provides display-ready data for steward role.
 * @module lib/viewmodels/role-viewmodels/steward-viewmodel
 */

const { createViewModel, createAction } = require('../base-viewmodel');

function createStewardViewModel(shipState, passengers = [], provisions = {}) {
  const unhappy = passengers.filter(p => p.satisfaction < 50);
  const highPassage = passengers.filter(p => p.class === 'high');
  const provisionsLow = (provisions.current || 0) < (provisions.max || 100) * 0.2;

  const state = {
    passengers: {
      total: passengers.length,
      high: highPassage.length,
      middle: passengers.filter(p => p.class === 'middle').length,
      low: passengers.filter(p => p.class === 'low').length,
      unhappy: unhappy.length
    },
    provisions: {
      current: provisions.current || 100,
      max: provisions.max || 100,
      daysRemaining: provisions.daysRemaining || 14,
      low: provisionsLow
    }
  };

  const derived = {
    statusBadge: provisionsLow ? 'LOW SUPPLIES' : unhappy.length > 0 ? 'COMPLAINTS' : 'NOMINAL',
    statusClass: provisionsLow ? 'low-supplies' : unhappy.length > 0 ? 'complaints' : 'nominal',
    passengerCountText: `${passengers.length} passengers`,
    provisionsText: `${state.provisions.daysRemaining} days provisions`
  };

  const actions = {
    servePassengers: createAction(passengers.length > 0, passengers.length > 0 ? null : 'No passengers'),
    addressComplaint: createAction(unhappy.length > 0, unhappy.length > 0 ? null : 'No complaints'),
    rationing: createAction(provisionsLow, provisionsLow ? null : 'Provisions adequate')
  };

  return createViewModel('steward', state, derived, actions);
}

module.exports = { createStewardViewModel };
