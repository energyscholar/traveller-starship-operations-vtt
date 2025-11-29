# BUG: Solo Mode Freezes When Player Launches Missile

**Date Reported:** 2025-11-29
**Priority:** HIGH
**Environment:** Solo mode (vs AI)
**Status:** 🐛 CONFIRMED BUG

---

## Summary

When player launches a missile in Solo mode, the game freezes after the missile moves. The AI opponent fails to take its turn, causing the UI to become unresponsive. Player gets disconnected after 34s idle timeout.

---

## Reproduction Steps

1. Start game in Solo mode (`http://localhost:3000/?mode=solo`)
2. Select Scout ship, start combat
3. Fight several rounds with lasers (works fine)
4. Launch a missile at opponent
5. **BUG:** Game freezes, AI doesn't respond

---

## Log Analysis

```
] [COMBAT]: [SPACE:MISSILE] Player 1 launching missile
] [COMBAT]: [SPACE:MISSILE] Missile launched: missile_1 from Scout to Free Trader at medium
] [COMBAT]: [SPACE:ROUND] Starting round 5, 1 missile updates
] [COMBAT]: [SPACE:MISSILE] missile_1 moved to short
] [COMBAT]: [SPACE:ROUND] Round 5 notifications sent to 1/2 players  ← PROBLEM: Only 1/2 notified
] [COMBAT]: [SPACE:MISSILE] Player 1 launching missile
] [COMBAT]: [SPACE:MISSILE] Missile launched: missile_2 from Scout to Free Trader at medium
] [COMBAT]: [SPACE:TURN_CHANGE] Active player: dummy_ai  ← AI's turn starts
                                                          ← MISSING: No AI action executed!
] [SERVER]: 📊 Performance Metrics: ...
] [SOCKET]: ⏱️  Player 1 idle for 34s, disconnecting  ← Player times out
```

---

## Root Cause

**Missing AI Logic for Active Missiles**

When missiles are in flight, the AI (`dummy_ai`) needs to:
1. Detect that it's now its turn
2. Decide whether to use point defense against incoming missiles
3. OR just end turn to let missiles continue moving

**Current behavior:** AI does NOT execute any action when missiles are active, causing the game loop to stall.

**Expected behavior:** AI should automatically:
- Use point defense if incoming missiles detected
- OR end turn immediately if no incoming missiles

---

## Evidence from Logs

### ✅ AI Works Fine Without Missiles

Earlier rounds (before missiles):
```
] [COMBAT]: [SPACE:TURN_CHANGE] Active player: dummy_ai, notifications sent to 1 player(s)
] [COMBAT]: [SOLO MODE] AI turn detected, executing AI action...  ← AI responds
] [COMBAT]: [AI] Executing turn for free_trader
] [COMBAT]: [AI] Performing dodge maneuver
```

### ❌ AI Fails With Active Missiles

After missile launch:
```
] [COMBAT]: [SPACE:TURN_CHANGE] Active player: dummy_ai
                                                          ← MISSING: No AI execution!
```

**The critical log line `[SOLO MODE] AI turn detected, executing AI action...` never appears after missiles are launched.**

---

## Affected Code Locations

### Primary Location: `server.js` (AI Turn Handler)

Look for the code that handles AI turns when missiles are active:

```javascript
// Likely around line 800-1000 in server.js
// Search for: "SOLO MODE" or "AI turn detected"

// SUSPECTED ISSUE: AI turn detection may not trigger when:
// 1. Round advances due to missile movement
// 2. Turn changes to AI after missile launch
```

### Secondary Location: Missile Movement Logic

```javascript
// Missile movement likely triggers round advancement
// This may bypass normal AI turn detection
```

---

## Proposed Fix

### Option 1: Add Missile-Aware AI Logic (RECOMMENDED)

```javascript
// In AI turn handler (server.js)
function handleAITurn(combatId) {
  const combat = activeCombats.get(combatId);

  // NEW: Check for incoming missiles
  const incomingMissiles = combat.missiles.filter(m => m.target === 'ai_ship');

  if (incomingMissiles.length > 0) {
    // Decide: use point defense or dodge
    const usePointDefense = Math.random() > 0.5;
    if (usePointDefense) {
      handlePointDefense(combatId, incomingMissiles[0].id);
    } else {
      endAITurn(combatId); // Just end turn, let missile approach
    }
  } else {
    // Normal combat logic (laser attack, dodge, etc.)
    executeNormalAIAction(combatId);
  }
}
```

### Option 2: Force AI Turn After Missile Movement

```javascript
// After missiles move each round
function updateMissiles(combatId) {
  // ... missile movement logic ...

  // NEW: If it's AI's turn after missile update, trigger AI
  if (combat.activePlayer === 'dummy_ai') {
    setTimeout(() => handleAITurn(combatId), 500); // Small delay for UI
  }
}
```

---

## Testing Checklist

After fix is implemented:

- [ ] Solo mode: Launch missile, verify AI responds within 1 second
- [ ] Solo mode: Multiple missiles in flight, AI handles correctly
- [ ] Solo mode: AI uses point defense when missiles incoming
- [ ] Solo mode: AI ends turn properly when no incoming missiles
- [ ] Solo mode: No idle timeouts during missile combat
- [ ] Multiplayer mode: Verify fix doesn't break human vs human missile combat

---

## Workaround (For Users)

**Current workaround:** Do not use missiles in Solo mode. Stick to laser weapons only.

---

## Related Issues

- None currently, but may affect:
  - Point defense testing
  - Missile ammo tracking
  - Turn timer logic

---

## Implementation Priority

**HIGH PRIORITY** - This breaks Solo mode gameplay for missiles, which is a core feature of Stage 11.

**Estimated Fix Time:** 30-60 minutes
- 15 min: Locate AI turn handler code
- 15 min: Add missile-aware logic
- 15 min: Test in Solo mode
- 15 min: Test edge cases (multiple missiles, point defense)

---

## Next Steps

1. ✅ Document bug (this file)
2. ⏳ Locate AI turn handler in `server.js`
3. ⏳ Implement missile-aware AI logic
4. ⏳ Test with missiles in Solo mode
5. ⏳ Commit fix with comprehensive tests
6. ⏳ Update CHANGELOG.md

---

**Discovered by:** bruce (user testing)
**Documented by:** Claude (AI assistant)
**Assignment:** Deferred to future session
