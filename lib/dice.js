// Dice rolling with deterministic seed support for Traveller 2e
// Allows server validation of client-side rolls

class DiceRoller {
  constructor(seed = null) {
    this.seed = seed || Date.now();
    this.rng = this.seedRandom(this.seed);
  }
  
  // Seeded random number generator (for validation)
  seedRandom(seed) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }
  
  // Roll N dice with D sides
  roll(count, sides) {
    const rolls = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(this.rng() * sides) + 1);
    }
    
    return {
      dice: rolls,
      total: rolls.reduce((a, b) => a + b, 0),
      seed: this.seed
    };
  }
  
  // Roll 2d6 (standard Traveller)
  roll2d6() {
    return this.roll(2, 6);
  }
  
  // Roll with notation (e.g., "2d6", "1d10")
  rollNotation(notation) {
    const match = notation.match(/(\d+)d(\d+)/);
    if (!match) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }
    
    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    
    return this.roll(count, sides);
  }
}

// Validate that a roll matches a seed
function validateRoll(roll, seed) {
  const validator = new DiceRoller(seed);
  const testRoll = validator.roll(roll.dice.length, 6);
  
  return JSON.stringify(roll.dice) === JSON.stringify(testRoll.dice);
}

// Standalone dice utilities (Math.random-based, no seeding)
// Use these for game mechanics. Use DiceRoller for reproducible/testable rolls.
function roll1d6() {
  return Math.floor(Math.random() * 6) + 1;
}

function roll2d6() {
  const d1 = roll1d6();
  const d2 = roll1d6();
  return { dice: [d1, d2], total: d1 + d2 };
}

function roll2d6Sum() {
  return roll1d6() + roll1d6();
}

function rollNd6(n) {
  const dice = [];
  for (let i = 0; i < n; i++) dice.push(roll1d6());
  return { dice, total: dice.reduce((a, b) => a + b, 0) };
}

module.exports = { DiceRoller, validateRoll, roll1d6, roll2d6, roll2d6Sum, rollNd6 };
