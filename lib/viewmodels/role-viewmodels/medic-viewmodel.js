/**
 * Medic ViewModel
 * Provides display-ready data for medic role.
 * @module lib/viewmodels/role-viewmodels/medic-viewmodel
 */

const { createViewModel, createAction } = require('../base-viewmodel');

function createMedicViewModel(shipState, crewHealth = [], medicalSupplies = {}) {
  const injured = crewHealth.filter(c => c.wounds > 0 || c.status === 'injured');
  const critical = crewHealth.filter(c => c.status === 'critical');
  const suppliesLow = (medicalSupplies.current || 0) < (medicalSupplies.max || 10) * 0.2;

  const state = {
    crew: {
      total: crewHealth.length,
      healthy: crewHealth.filter(c => c.wounds === 0 && c.status !== 'injured' && c.status !== 'critical').length,
      injured: injured.length,
      critical: critical.length
    },
    supplies: {
      current: medicalSupplies.current || 10,
      max: medicalSupplies.max || 10,
      low: suppliesLow
    }
  };

  const derived = {
    statusBadge: critical.length > 0 ? 'CRITICAL' : injured.length > 0 ? 'CASUALTIES' : 'ALL HEALTHY',
    statusClass: critical.length > 0 ? 'critical' : injured.length > 0 ? 'casualties' : 'healthy',
    injuredCountText: `${injured.length} injured`,
    criticalCountText: `${critical.length} critical`,
    suppliesText: `${state.supplies.current}/${state.supplies.max} supplies`
  };

  const actions = {
    treat: createAction(injured.length > 0, injured.length > 0 ? null : 'No injured crew'),
    stabilize: createAction(critical.length > 0, critical.length > 0 ? null : 'No critical patients'),
    useSupplies: createAction(state.supplies.current > 0, state.supplies.current > 0 ? null : 'No supplies')
  };

  return createViewModel('medic', state, derived, actions);
}

module.exports = { createMedicViewModel };
