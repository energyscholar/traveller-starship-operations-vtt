/**
 * Captain ViewModel
 * Wraps captain-state.js to provide display-ready data.
 * @module lib/viewmodels/role-viewmodels/captain-viewmodel
 */

const { createViewModel, createAction } = require('../base-viewmodel');
const { getCaptainState } = require('../../engine/roles/captain-state');

function createCaptainViewModel(shipState, template, ship, crewOnline, contacts, rescueTargets = [], activePanel = 'captain') {
  const state = getCaptainState(shipState, template, ship, crewOnline, contacts, rescueTargets, activePanel);

  const alertLevel = state.alert?.level || 'green';

  const derived = {
    statusBadge: alertLevel === 'red' ? 'RED ALERT' :
                 alertLevel === 'yellow' ? 'YELLOW ALERT' : 'NORMAL',
    statusClass: `alert-${alertLevel}`,

    // BUG FIX: state.crew.online is an array, use state.crew.count instead
    crewCountText: `${state.crew?.count || 0} crew online`,
    alertText: state.alert?.text || 'Normal operations',

    // BUG FIX: state.shipName/shipClass are direct properties, not state.ship.name
    shipNameText: state.shipName || 'Unknown',
    shipClassText: state.shipClass || 'Unknown class',

    contactSummaryText: state.tactical?.contactCount
      ? `${state.tactical.contactCount} contacts`
      : 'No contacts',
    hostileSummaryText: state.tactical?.hostileCount
      ? `${state.tactical.hostileCount} hostile`
      : 'None hostile'
  };

  const actions = {
    setAlert: createAction(true, null),
    issueOrder: createAction(true, null),
    // BUG FIX: Use state.crew.count (number), not state.crew.online (array)
    relieveCrew: createAction((state.crew?.count || 0) > 0,
      (state.crew?.count || 0) > 0 ? null : 'No crew to relieve'),
    initiateRescue: createAction(rescueTargets.length > 0,
      rescueTargets.length > 0 ? null : 'No rescue targets')
  };

  return createViewModel('captain', state, derived, actions);
}

module.exports = { createCaptainViewModel };
