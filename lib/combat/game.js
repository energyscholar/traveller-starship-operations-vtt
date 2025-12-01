/**
 * Game Logic Module
 * Handles game flow: initiative, rounds, turns, crew generation
 *
 * @see lib/factories/CrewFactory.js for crew creation (Factory Pattern)
 */

const { game: gameLog } = require('../logger');
const { DiceRoller } = require('../dice');
const { CrewFactory } = require('../factories');

/**
 * Generate default crew for a ship type
 * Delegates to CrewFactory for consistent entity creation
 * @param {string} shipType - 'scout' or 'free_trader'
 * @returns {Array} Crew members
 */
function generateDefaultCrew(shipType) {
  return CrewFactory.createSpaceCrew(shipType);
}

/**
 * Roll initiative for both ships
 * @param {Object} shipState - Ship state object
 * @param {Object} gameState - Game state object
 * @returns {Object} Initiative results
 */
function rollInitiative(shipState, gameState) {
  const dice = new DiceRoller();

  // Roll 2d6 + pilot skill for each ship
  const scoutRoll = dice.roll2d6();
  const scoutInitiative = scoutRoll.total + shipState.scout.pilotSkill;

  const free_traderRoll = dice.roll2d6();
  const free_traderInitiative = free_traderRoll.total + shipState.free_trader.pilotSkill;

  gameState.initiative.scout = {
    roll: scoutRoll,
    total: scoutInitiative
  };

  gameState.initiative.free_trader = {
    roll: free_traderRoll,
    total: free_traderInitiative
  };

  gameLog.info(`Scout: ${scoutRoll.total} + ${shipState.scout.pilotSkill} = ${scoutInitiative}`);
  gameLog.info(`Free Trader: ${free_traderRoll.total} + ${shipState.free_trader.pilotSkill} = ${free_traderInitiative}`);

  // Determine who goes first (handle ties by re-rolling)
  if (scoutInitiative > free_traderInitiative) {
    gameState.currentTurn = 'scout';
    gameLog.info('Scout goes first');
  } else if (free_traderInitiative > scoutInitiative) {
    gameState.currentTurn = 'free_trader';
    gameLog.info('Free Trader goes first');
  } else {
    // Tie - Scout wins ties (simple tiebreaker)
    gameState.currentTurn = 'scout';
    gameLog.info('Tie! Scout wins tiebreaker');
  }

  return {
    scout: gameState.initiative.scout,
    free_trader: gameState.initiative.free_trader,
    firstTurn: gameState.currentTurn
  };
}

/**
 * Start a new round
 * @param {Object} shipState - Ship state object
 * @param {Object} gameState - Game state object
 * @returns {Object} Round data
 */
function startNewRound(shipState, gameState) {
  gameState.currentRound++;
  gameLog.info(` Starting Round ${gameState.currentRound}`);

  // Roll initiative at the start of each round
  const initiativeResult = rollInitiative(shipState, gameState);

  // Add to round history
  gameState.roundHistory.push({
    round: gameState.currentRound,
    initiative: initiativeResult,
    actions: []
  });

  return {
    round: gameState.currentRound,
    initiative: initiativeResult,
    currentTurn: gameState.currentTurn
  };
}

/**
 * End current turn and advance to next player
 * @param {Object} shipState - Ship state object
 * @param {Object} gameState - Game state object
 * @returns {Object} Turn/round data
 */
function endTurn(shipState, gameState) {
  const previousTurn = gameState.currentTurn;

  // Switch to other player
  if (gameState.currentTurn === 'scout') {
    gameState.currentTurn = 'free_trader';
  } else if (gameState.currentTurn === 'free_trader') {
    // Free Trader's turn ends, round ends, new round starts
    return startNewRound(shipState, gameState);
  }

  gameLog.info(` ${previousTurn} turn ended, ${gameState.currentTurn} turn begins`);

  return {
    round: gameState.currentRound,
    currentTurn: gameState.currentTurn,
    newRound: false
  };
}

/**
 * Reset game state (rounds and turns)
 * @param {Object} gameState - Game state object
 */
function resetGameState(gameState) {
  gameState.currentRound = 0;
  gameState.currentTurn = null;
  gameState.initiative.scout = null;
  gameState.initiative.free_trader = null;
  gameState.roundHistory = [];
  gameLog.info(' Game state reset');
}

module.exports = {
  generateDefaultCrew,
  rollInitiative,
  startNewRound,
  endTurn,
  resetGameState
};
