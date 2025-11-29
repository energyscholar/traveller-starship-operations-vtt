# BUG: Solo Mode AI Never Actually Attacks

**Date Reported:** 2025-11-29
**Priority:** CRITICAL
**Environment:** Solo mode (vs AI)
**Status:** 🐛 CONFIRMED BUG - Game Breaking

---

## Summary

In Solo mode, the AI opponent makes combat decisions (fire, dodge, sandcaster) but **NEVER ACTUALLY EXECUTES THEM**. The AI logs show "Would fire weapon" or "Would perform dodge" instead of actually performing the actions. This causes the AI to lose battles it should easily win.

**Result:** Player won 23-round combat with Scout (40 hull) vs Free Trader (80 hull) - AI never dealt a single point of damage despite having two Beam Lasers and superior hull strength.

---

## Reproduction Steps

1. Start game in Solo mode (`http://localhost:3000/?mode=solo`)
2. Select Scout ship, start combat
3. Fire lasers at AI opponent repeatedly
4. **BUG:** AI never returns fire, only says "Would fire weapon"
5. Player defeats much stronger opponent without taking damage

---

## Log Analysis

### ❌ AI "Decides" But Never Executes

Every single AI turn shows this pattern:

```
] [COMBAT]: [SOLO MODE] AI turn detected, executing AI action...
] [COMBAT]: [AI] Executing turn for free_trader
] [COMBAT]: [AI] Found laser weapon at index 0: Beam Laser
] [COMBAT]: [AI] Found laser weapon at index 1: Beam Laser
] [COMBAT]: [AI] Attacking with laser
] [COMBAT]: [AI] Decision: fire {"turret":0,"weapon":1,"target":"opponent"}
] [COMBAT]: [AI] Would fire weapon (turret 0, weapon 1)  ← PROBLEM: "Would" not "Did"
```

**Missing:** No `[SPACE:FIRE]` event, no attack roll, no damage

### ✅ Compare to Player Actions

```
] [COMBAT]: [SPACE:FIRE] Player 1 firing {"turret":0,"target":"opponent","weapon":0}
] [COMBAT]: [SPACE:FIRE] Attack result: {"attacker":"Scout","target":"Free Trader","weapon":"Pulse Laser",...}
] [COMBAT]: [SPACE:FIRE] HIT! 5 damage. Hull: 75/80
```

**Player gets:** `[SPACE:FIRE]` event, attack roll, damage applied

**AI gets:** Nothing. Just logs saying what it "would" do.

---

## Evidence from Logs

### Round 1: AI Decides to Dodge
```
] [COMBAT]: [AI] Performing dodge maneuver
] [COMBAT]: [AI] Decision: dodge
] [COMBAT]: [AI] Would perform dodge maneuver  ← Never actually dodges
```

### Round 2-7: AI Decides to Fire
```
] [COMBAT]: [AI] Attacking with laser
] [COMBAT]: [AI] Decision: fire {"turret":0,"weapon":1,"target":"opponent"}
] [COMBAT]: [AI] Would fire weapon (turret 0, weapon 1)  ← Never actually fires
```

### Round 9: AI Decides to Dodge Again
```
] [COMBAT]: [AI] Performing dodge maneuver
] [COMBAT]: [AI] Decision: dodge
] [COMBAT]: [AI] Would perform dodge maneuver  ← Never actually dodges
```

### Round 12, 13, 19, 20, 21, 22: AI Decides to Use Sandcaster
```
] [COMBAT]: [AI] Using sandcaster (hull at 59%)
] [COMBAT]: [AI] Decision: sandcaster
] [COMBAT]: [AI] Would use sandcaster  ← Never actually uses sandcaster
```

**Pattern:** AI makes correct tactical decisions (fire when healthy, sandcaster when damaged) but NEVER EXECUTES them.

---

## Root Cause

**AI Decision Code is Disconnected from Execution Code**

The AI logic appears to have two layers:
1. **Decision Layer** - Analyzes combat state, chooses action (works ✓)
2. **Execution Layer** - Actually performs the action (broken ✗)

The decision layer logs `"Would [action]"` suggesting it's calling a preview/dry-run function instead of the actual execution function.

**Suspected code location:** `server.js` AI turn handler

---

## Expected vs Actual Behavior

### Expected:
1. AI turn starts
2. AI analyzes situation
3. AI decides: "fire laser"
4. **AI executes fire action** → `[SPACE:FIRE]` event
5. Attack roll, damage calculation, hull update
6. Turn ends

### Actual:
1. AI turn starts
2. AI analyzes situation
3. AI decides: "fire laser"
4. **AI logs "Would fire weapon" and does nothing**
5. Turn ends with no action taken

---

## Impact

**CRITICAL - Game Breaking**

- Solo mode is completely unbalanced
- AI cannot win even with superior ships
- Players can defeat any opponent without taking damage
- Core gameplay loop broken for single-player mode
- Missiles bug (TODO-solo-missile-freeze.md) is overshadowed by this more fundamental issue

---

## Affected Code Locations

### Primary Location: `server.js` (AI Action Execution)

```javascript
// Likely around line 800-1200 in server.js
// Search for: "Would fire weapon" or "Would perform dodge"

// SUSPECTED ISSUE:
// AI decision code calls preview/mock functions instead of real execution
// Example pseudocode:

function handleAITurn(combatId) {
  const decision = makeAIDecision(combat);  // Works ✓

  if (decision.action === 'fire') {
    // BUG: This might be calling a preview function
    previewWeaponFire(decision.turret, decision.weapon);  // ✗ Wrong

    // Should be calling:
    // executeWeaponFire(playerId, decision.turret, decision.weapon);  // ✓ Correct
  }
}
```

---

## Proposed Fix

### Option 1: Connect AI Decisions to Real Execution Functions (RECOMMENDED)

```javascript
// In AI turn handler (server.js)
function handleAITurn(combatId) {
  const combat = activeCombats.get(combatId);
  const decision = makeAIDecision(combat);

  // Execute the decision (not preview!)
  switch (decision.action) {
    case 'fire':
      // CALL THE REAL FIRING FUNCTION
      executeWeaponFire('dummy_ai', decision.turret, decision.target, decision.weapon);
      break;

    case 'dodge':
      // CALL THE REAL DODGE FUNCTION
      executeDodgeManeuver('dummy_ai');
      break;

    case 'sandcaster':
      // CALL THE REAL SANDCASTER FUNCTION
      executeSandcaster('dummy_ai');
      break;
  }
}
```

### Option 2: Remove "Would" Logging, Add Actual Execution

```javascript
// Replace:
console.log(`[AI] Would fire weapon (turret ${t}, weapon ${w})`);

// With:
console.log(`[AI] Firing weapon (turret ${t}, weapon ${w})`);
handleFireWeapon(aiSocketId, { turret: t, weapon: w, target: 'opponent' });
```

---

## Testing Checklist

After fix is implemented:

- [ ] Solo mode: AI fires lasers and deals damage to player
- [ ] Solo mode: AI dodge maneuvers are applied (dodge bonus active)
- [ ] Solo mode: AI sandcasters create defensive screens
- [ ] Solo mode: Player vs Free Trader - AI should win or be competitive (not lose 80→0 without dealing damage)
- [ ] Solo mode: Balanced combat where both ships take damage
- [ ] Multiplayer mode: Verify fix doesn't break human vs human combat
- [ ] Check for `[SPACE:FIRE]` events in logs for AI attacks
- [ ] Verify attack rolls, damage calculation, and hull updates occur for AI

---

## Related Issues

- **TODO-solo-missile-freeze.md** - Missile freeze bug (may be related to same AI execution disconnect)
- Stage 11 features - AI should be using missiles, sandcasters, point defense

---

## Debug Questions

1. Why does AI code use "Would [action]" language?
2. Is there a `dryRun` or `preview` mode accidentally enabled?
3. Are AI actions being queued but never processed?
4. Is there a missing `emit()` call to trigger combat resolution?
5. Does the AI share the same execution functions as human players, or are there separate AI-specific functions?

---

## Workaround (For Users)

**Current workaround:** None. Solo mode is broken.

---

## Implementation Priority

**CRITICAL PRIORITY** - This completely breaks Solo mode gameplay.

**Estimated Fix Time:** 30-90 minutes
- 15 min: Locate AI decision code
- 15 min: Find where "Would [action]" logs are generated
- 30 min: Connect decisions to actual execution functions
- 15 min: Test in Solo mode with multiple action types
- 15 min: Verify balanced combat (both ships take damage)

---

## Next Steps

1. ✅ Document bug (this file)
2. ⏳ Locate AI turn handler in `server.js`
3. ⏳ Find "Would fire weapon" log statement
4. ⏳ Trace back to decision code
5. ⏳ Replace preview/mock calls with real execution calls
6. ⏳ Test with lasers, dodge, sandcasters
7. ⏳ Verify 10+ round combat where both ships take damage
8. ⏳ Commit fix with comprehensive tests
9. ⏳ Update CHANGELOG.md

---

**Discovered by:** bruce (user testing)
**Documented by:** Claude (AI assistant)
**Priority:** CRITICAL - Blocks Solo mode completely
**Stage:** Stage 11 - Basic Solo mode should work

---

## Additional Evidence

From 23 rounds of combat:
- **Player attacks:** 23 attempts, multiple hits, reduced AI from 80→0 hull
- **AI attacks:** 0 executed (despite ~15 "Would fire" decisions)
- **AI dodges:** 0 executed (despite 3 "Would dodge" decisions)
- **AI sandcasters:** 0 executed (despite 4 "Would use sandcaster" decisions)

**Expected outcome:** Free Trader (80 hull, 2x Beam Lasers) should defeat Scout (40 hull, 1x Pulse Laser)
**Actual outcome:** Scout won without taking a single point of damage

This is the most critical bug in the system - the AI opponent is completely non-functional.
