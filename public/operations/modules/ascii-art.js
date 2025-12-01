/**
 * ASCII Art Module
 * Ship and celestial body ASCII art for Operations VTT
 *
 * Extracted from app.js for modularization (Autorun 3, Stage 1)
 */

// ==================== SHIP-6: ASCII Art for Ships ====================
// ASCII art representations for ship types displayed in tooltips/modals

export const SHIP_ASCII_ART = {
  // Small craft (10-20 tons)
  'light_fighter': `
    /\\
   /  \\
  |====|
   \\||/
    \\/`,
  'launch': `
   ____
  /    \\
 |====  |
 |______|
   \\  /`,
  // Free Traders / Merchants (100-400 tons)
  'free_trader': `
     ___
   _/   \\_
  |==|  |==|
  |__|==|__|
    \\____/`,
  'far_trader': `
     ___
   _/   \\_
  |==|  |==|
  |__|==|__|
   _\\____/_`,
  'subsidized_merchant': `
      ____
    _/    \\_
   |==|  |==|
   |__|==|__|
   |________|
     \\    /`,
  // Military / Combat
  'patrol_corvette': `
     /\\
    /==\\
   |====|
   |====|
    \\==/`,
  'x_carrier': `
       ____
     _/    \\_
    |==|  |==|
   [|__|==|__|]
   [|________|]
     \\      /`,
  // Generic types for unknown/unidentified
  'small_craft': `
    /\\
   /  \\
  |    |
   \\  /`,
  'freighter': `
    ____
   /    \\
  |======|
  |______|
    \\  /`,
  'warship': `
     /\\
    /==\\
   /====\\
  |======|
   \\====/`,
  'unknown': `
    ????
   ?    ?
   ?    ?
    ????`,
  // Celestial objects
  'star': `
    \\|/
   --*--
    /|\\`,
  'planet': `
    .--.
   (    )
    '--'`,
  'belt': `
  * . * .
 . * . *
  * . * .`,
  'starport': `
    _||_
   |====|
  /|    |\\
  \\|____|/`
};

/**
 * Get ASCII art for a ship type
 * @param {string} shipType - Ship type identifier
 * @returns {string} ASCII art or empty string if not found
 */
export function getShipAsciiArt(shipType) {
  if (!shipType) return '';
  const normalizedType = shipType.toLowerCase().replace(/[- ]/g, '_');
  return SHIP_ASCII_ART[normalizedType] || SHIP_ASCII_ART['unknown'] || '';
}
