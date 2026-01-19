/**
 * Marines ViewModel
 * Provides display-ready data for marines role.
 * @module lib/viewmodels/role-viewmodels/marines-viewmodel
 */

const { createViewModel, createAction } = require('../base-viewmodel');

function createMarinesViewModel(shipState, marineSquad = [], boardingStatus = {}) {
  const ready = marineSquad.filter(m => m.status === 'ready');
  const deployed = marineSquad.filter(m => m.status === 'deployed');
  const wounded = marineSquad.filter(m => m.status === 'wounded');

  const state = {
    squad: {
      total: marineSquad.length,
      ready: ready.length,
      deployed: deployed.length,
      wounded: wounded.length
    },
    boarding: {
      active: boardingStatus.active || false,
      target: boardingStatus.target || null,
      phase: boardingStatus.phase || 'none'
    }
  };

  const derived = {
    statusBadge: state.boarding.active ? 'BOARDING' : ready.length > 0 ? 'READY' : 'STAND DOWN',
    statusClass: state.boarding.active ? 'boarding' : ready.length > 0 ? 'ready' : 'stand-down',
    squadCountText: `${ready.length}/${marineSquad.length} ready`,
    boardingText: state.boarding.active ? `Boarding ${state.boarding.target}` : 'No boarding action'
  };

  const actions = {
    deploy: createAction(ready.length > 0 && !state.boarding.active,
      ready.length === 0 ? 'No ready marines' : state.boarding.active ? 'Already boarding' : null),
    recall: createAction(state.boarding.active, state.boarding.active ? null : 'No active boarding'),
    repelBoarders: createAction(ready.length > 0, ready.length > 0 ? null : 'No ready marines')
  };

  return createViewModel('marines', state, derived, actions);
}

module.exports = { createMarinesViewModel };
