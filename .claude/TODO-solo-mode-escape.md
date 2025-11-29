# TODO: Add Solo Mode Escape/Cancel Button

**Date Requested:** 2025-11-29
**Priority:** MEDIUM
**Type:** Feature Request
**Status:** 📋 TODO

---

## Summary

Add an "Abandon Battle" or "Return to Main Screen" button in Solo mode that allows the player to exit combat and return to the main screen. Button should include a confirmation dialog to prevent accidental exits.

---

## Requirements

### User Interface

1. **Button Placement**
   - Add "Abandon Battle" button to Solo mode combat UI
   - Position: Top-right corner or bottom-left (near other controls)
   - Make it visually distinct but not intrusive
   - Red or amber color to indicate destructive action

2. **Confirmation Dialog**
   - Show modal dialog when button is clicked
   - Title: "Abandon Battle?"
   - Message: "Are you sure you want to cancel this solo battle? All progress will be lost."
   - Buttons:
     - "Yes, Abandon" (red/destructive)
     - "No, Continue Fighting" (green/safe, default)
   - Close dialog on background click (with no action)
   - Keyboard support: ESC key = cancel, Enter key = focus default

3. **Button States**
   - Enabled: Always clickable during Solo mode combat
   - Disabled: Only in multiplayer mode (hide button entirely)
   - Visual feedback: Hover effect, click animation

---

## Implementation Details

### Frontend Changes

**File:** `public/app.js` (or equivalent vanilla JS UI file)

```javascript
// Add Abandon Battle button to Solo mode UI
function renderSoloModeControls() {
  // ... existing controls ...

  const abandonButton = document.createElement('button');
  abandonButton.id = 'abandonBattleBtn';
  abandonButton.className = 'abandon-battle-btn';
  abandonButton.textContent = '🚪 Abandon Battle';
  abandonButton.onclick = showAbandonConfirmation;

  // Add to UI container
  controlsContainer.appendChild(abandonButton);
}

// Show confirmation dialog
function showAbandonConfirmation() {
  const dialog = document.getElementById('abandonConfirmDialog');
  if (!dialog) {
    createAbandonDialog();
  }
  dialog.style.display = 'flex';
}

// Create confirmation dialog (one-time setup)
function createAbandonDialog() {
  const dialog = document.createElement('div');
  dialog.id = 'abandonConfirmDialog';
  dialog.className = 'modal-overlay';
  dialog.innerHTML = `
    <div class="modal-content">
      <h2>Abandon Battle?</h2>
      <p>Are you sure you want to cancel this solo battle? All progress will be lost.</p>
      <div class="modal-buttons">
        <button id="confirmAbandon" class="btn-danger">Yes, Abandon</button>
        <button id="cancelAbandon" class="btn-safe">No, Continue Fighting</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);

  // Event listeners
  document.getElementById('confirmAbandon').onclick = abandonBattle;
  document.getElementById('cancelAbandon').onclick = closeAbandonDialog;
  dialog.onclick = (e) => {
    if (e.target === dialog) closeAbandonDialog();
  };
}

// Execute abandon action
function abandonBattle() {
  // Emit socket event to cleanup combat
  socket.emit('space:abandonBattle');

  // Return to main screen
  showMainScreen();
  closeAbandonDialog();
}

// Close dialog
function closeAbandonDialog() {
  document.getElementById('abandonConfirmDialog').style.display = 'none';
}
```

### Backend Changes

**File:** `server.js`

```javascript
// Handle abandon battle event
socket.on('space:abandonBattle', () => {
  console.log(`[COMBAT]: Player ${socket.id} abandoned solo battle`);

  // Cleanup combat state
  const combatId = findCombatByPlayerId(socket.id);
  if (combatId) {
    activeCombats.delete(combatId);
    console.log(`[COMBAT]: Combat ${combatId} cleaned up after abandon`);
  }

  // Reset player state
  socket.spaceSelection = null;

  // Send confirmation
  socket.emit('space:battleAbandoned');
});
```

### CSS Styling

**File:** `public/style.css` (or equivalent)

```css
/* Abandon Battle Button */
.abandon-battle-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  border: 2px solid #7f1d1d;
  border-radius: 8px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 100;
}

.abandon-battle-btn:hover {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

/* Modal Overlay */
.modal-overlay {
  display: none; /* Hidden by default */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: #1a1a1a;
  border: 2px solid #444;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.modal-content h2 {
  color: #ef4444;
  margin-bottom: 15px;
  font-size: 1.8rem;
}

.modal-content p {
  color: #ccc;
  margin-bottom: 25px;
  font-size: 1.1rem;
  line-height: 1.5;
}

.modal-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.btn-danger {
  padding: 12px 24px;
  background: #dc2626;
  border: 2px solid #991b1b;
  border-radius: 6px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover {
  background: #ef4444;
  transform: scale(1.05);
}

.btn-safe {
  padding: 12px 24px;
  background: #059669;
  border: 2px solid #047857;
  border-radius: 6px;
  color: white;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-safe:hover {
  background: #10b981;
  transform: scale(1.05);
}
```

---

## User Experience Flow

1. **Player in Solo Mode**
   - Combat is active
   - Player sees "Abandon Battle" button in top-right

2. **Player Clicks Button**
   - Modal dialog appears with darkened background
   - "Abandon Battle?" title in red
   - Warning message about lost progress
   - Two clear options

3. **Player Confirms Abandon**
   - Dialog closes
   - Combat state cleaned up on server
   - UI returns to main screen
   - Player can start new combat or exit

4. **Player Cancels**
   - Dialog closes
   - Combat continues normally
   - No state changes

---

## Edge Cases

1. **Combat Already Ended**
   - Hide button if victory/defeat screen is shown
   - OR disable button with tooltip "Battle already concluded"

2. **Network Disconnect**
   - Button should still work (client-side navigation)
   - Server cleanup happens automatically on disconnect

3. **Multiplayer Mode**
   - Hide button entirely
   - Only show in Solo mode (vs AI)

4. **Mid-Animation**
   - Allow abandon during missile flight, critical hits, etc.
   - Clean up any pending animations/timers

---

## Testing Checklist

- [ ] Solo mode: Button appears in combat
- [ ] Solo mode: Button click shows confirmation dialog
- [ ] Dialog: "Yes, Abandon" returns to main screen
- [ ] Dialog: "No, Continue Fighting" closes dialog and resumes combat
- [ ] Dialog: Click background closes dialog (no abandon)
- [ ] Dialog: ESC key closes dialog (no abandon)
- [ ] Server: Combat state cleaned up after abandon
- [ ] Multiplayer mode: Button does not appear
- [ ] Victory/defeat screen: Button hidden or disabled
- [ ] Multiple abandons: Can start new combat after abandoning

---

## Alternative Designs

### Option 1: Text Link Instead of Button
```
[Abandon Battle] (subtle text link)
```
- Less intrusive
- Risk: May be missed by users

### Option 2: Pause Menu Integration
```
[Pause] → Menu with "Abandon Battle" option
```
- Requires pause system implementation
- More complex but cleaner UI

### Option 3: Double-Click to Abandon (No Dialog)
```
Button text changes: "Abandon Battle" → "Click again to confirm"
```
- Faster workflow
- Risk: Accidental double-clicks

**Recommendation:** Stick with main design (button + modal) for clarity and safety.

---

## Related Features

- **Pause System** - Future enhancement to pause Solo mode
- **Save/Load Combat** - Future enhancement to save progress
- **Combat Replay** - Future enhancement to review abandoned battles
- **Statistics Tracking** - Track abandoned battles in player stats

---

## Implementation Priority

**MEDIUM PRIORITY** - Quality of life improvement

**Estimated Implementation Time:** 1-2 hours
- 30 min: Frontend button and dialog UI
- 30 min: Backend cleanup handler
- 15 min: CSS styling
- 15 min: Testing all edge cases

---

## Next Steps

1. ⏳ Create Abandon Battle button in Solo mode UI
2. ⏳ Implement confirmation dialog
3. ⏳ Add server-side cleanup handler
4. ⏳ Style button and dialog
5. ⏳ Test in Solo mode (start combat, abandon, restart)
6. ⏳ Verify multiplayer mode unaffected
7. ⏳ Update user documentation

---

**Requested by:** bruce (user testing)
**Documented by:** Claude (AI assistant)
**Status:** Ready for implementation
