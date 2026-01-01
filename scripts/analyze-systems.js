#!/usr/bin/env node
/**
 * Gap Analysis: Can we visit all 440 systems?
 */

const loader = require('../lib/sector-loader');

// Count accessible systems (not Red zones)
const sector = loader.loadSector('Spinward Marches');
const accessible = sector.systems.filter(s => s.zone !== 'Red');
const redZones = sector.systems.filter(s => s.zone === 'Red');

// Count systems with refueling options
const withGasGiant = sector.systems.filter(s => (s.gg || 0) > 0);
const withStarport = sector.systems.filter(s => s.uwp && s.uwp[0] !== 'X');
const noRefuel = sector.systems.filter(s => (s.gg || 0) === 0 && (!s.uwp || s.uwp[0] === 'X'));

console.log('=== VISITABLE SYSTEMS ANALYSIS ===');
console.log('Total systems:', sector.systems.length);
console.log('Accessible (non-Red):', accessible.length);
console.log('Red zones (skip):', redZones.length);
console.log('');
console.log('=== REFUELING OPTIONS ===');
console.log('With gas giants:', withGasGiant.length);
console.log('With starport (A-E):', withStarport.length);
console.log('No refueling option:', noRefuel.length);
if (noRefuel.length > 0) {
  console.log('  Systems:', noRefuel.slice(0,10).map(s => s.name).join(', '));
}

// Check if routes connect everything
const routes = sector.routes || [];
console.log('');
console.log('=== TRADE ROUTES ===');
console.log('Total routes:', routes.length);

// Build connectivity graph
const connected = new Set();
routes.forEach(r => {
  connected.add(r.start);
  connected.add(r.end);
});
console.log('Systems on routes:', connected.size);

// Systems NOT on routes
const isolated = accessible.filter(s => !connected.has(s.hex));
console.log('Isolated (no route):', isolated.length);

// Check celestial data
const withCelestial = Object.keys(sector.celestialData || {}).length;
console.log('');
console.log('=== CELESTIAL DATA ===');
console.log('Systems with celestial objects:', withCelestial);
console.log('Missing celestial data:', sector.systems.length - withCelestial);

// Check locations
const withLocations = Object.keys(sector.locations || {}).length;
console.log('Systems with locations:', withLocations);
