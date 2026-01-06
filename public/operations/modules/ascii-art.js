/**
 * ASCII Art Module
 * Ship and celestial body ASCII art for Operations VTT
 *
 * Extracted from app.js for modularization (Autorun 3, Stage 1)
 */

// ==================== SHIP-6: ASCII Art for Ships ====================
// ASCII art representations for ship types displayed in tooltips/modals

export const SHIP_ASCII_ART = {
  // Scout/Courier (100 tons) - Type S
  // Flat delta wedge, pointed nose, wide swept wings
  'scout': `
      ^
     /|\\
    / | \\
   /__|__\\
  /========\\
    \\==/`,
  'scout_courier': `
      ^
     /|\\
    / | \\
   /__|__\\
  /========\\
    \\==/`,
  'type_s': `
      ^
     /|\\
    / | \\
   /__|__\\
  /========\\
    \\==/`,
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

// Large ASCII art for ship status panels (side view profiles)
export const SHIP_ASCII_ART_LARGE = {
  // Type-S Scout/Courier - flat delta wedge, side profile
  'scout': `
                                    ___
                               ____/   \\
                          ____/    ●    \\____
                     ____/                    \\____
                ____/   [=====]                    \\____
           ____/        [=====]  ___                    \\____
      ____/             [=====] |   |                        \\____
  ___/                          |___|   ____                      \\___
 /_______________________________________________[====]______________[]>
     \\___     \\                             /          ___/
         \\___  \\___________________________/      ___/
             \\___                             ___/
                 \\_________________________/
                         ||      ||
                        _||_    _||_`,
  'scout_courier': null,  // alias - uses 'scout'
  'type_s': null,         // alias - uses 'scout'

  // Q-Ship / Armed Merchant (default)
  'q_ship': `
         _____________________
        /                     \\
       /   [=]   [=]   [=]     \\
      /     _________________   \\
     |     |                 |   |
     |  ●  |    [========]   |   |===>
     |     |_________________|   |
      \\                         /
       \\_______________________/
              ||       ||
             _||_     _||_`,

  // Generic merchant fallback
  'merchant': null,  // uses q_ship
  'freighter': null, // uses q_ship
  'x_carrier': null  // uses q_ship - Amishi is a Q-ship conversion
};

/**
 * Get ASCII art for a ship type
 * @param {string} shipType - Ship type identifier
 * @returns {string} ASCII art or empty string if not found
 */
export function getShipAsciiArt(shipType) {
  if (!shipType) return '';
  const normalizedType = shipType.toLowerCase().replace(/[- /]/g, '_');
  return SHIP_ASCII_ART[normalizedType] || SHIP_ASCII_ART['unknown'] || '';
}

/**
 * Get large ASCII art for ship status panel
 * @param {string} shipType - Ship type identifier
 * @returns {string} Large ASCII art or null if not available
 */
export function getShipAsciiArtLarge(shipType) {
  if (!shipType) return null;
  const normalizedType = shipType.toLowerCase().replace(/[- /]/g, '_');
  let art = SHIP_ASCII_ART_LARGE[normalizedType];

  // Handle aliases (missing keys return undefined, explicit null marks alias)
  if (!art) {
    if (normalizedType === 'scout_courier' || normalizedType === 'type_s') {
      art = SHIP_ASCII_ART_LARGE['scout'];
    } else if (normalizedType === 'merchant' || normalizedType === 'freighter' || normalizedType === 'x_carrier' || normalizedType.startsWith('q_ship')) {
      art = SHIP_ASCII_ART_LARGE['q_ship'];
    }
  }

  return art || null;
}
