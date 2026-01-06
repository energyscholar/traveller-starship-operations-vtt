# UI Element ID Audit Report

**Generated:** 2026-01-06
**Scope:** `/public/operations` directory

## Summary

| Metric | Value |
|--------|-------|
| Total unique IDs | 559 |
| Duplicate IDs | 29 |
| Interactive elements without IDs | 87 |
| Naming convention violations | 6 |

## 1. Duplicate ID Issues

### Static Duplicates

| ID | Location 1 | Location 2 |
|----|------------|------------|
| `menu-library` | index.html:744 | index.html:796 |
| `system-map-container` | index.html:1960 | app.js:2697 |
| `btn-mail-reply` | index.html:1897 | email-app.js:176 |
| `btn-mail-archive` | index.html:1898 | email-app.js:177 |

### Form Field Duplicates

These IDs appear in multiple modal/edit contexts:

| ID | Issue |
|----|-------|
| `crew-name`, `crew-role`, `crew-personality`, `crew-skill` | Multiple crew edit contexts |
| `contact-type`, `contact-name`, `contact-range`, `contact-notes` | Add vs edit modals |
| `compose-body`, `compose-subject`, `compose-recipient` | Multiple compose contexts |
| `reveal-type`, `reveal-title`, `reveal-target`, `reveal-description` | Multiple reveal forms |

### Dynamic IDs (Template Strings)

These files generate IDs at runtime:

| Pattern | File | Count |
|---------|------|-------|
| `${c.id}` | gm-bridge-menu.js | 9 |
| `${mail.id}` | email-app.js | 6 |
| `${t.id}` | encounter-builder.js | 3 |
| `${crew.id}` | crew-roster-full.js | 4 |

## 2. Missing IDs on Interactive Elements

87 interactive elements lack IDs. Priority areas:

| Category | Count | Example |
|----------|-------|---------|
| Panel expand buttons | 12 | `data-panel="sensor-display"` |
| Time quick buttons | 8 | `onclick="window.gmAdvanceTime(10)"` |
| GM damage controls | 6 | `onclick="window.gmApplyDamage(1)"` |
| Menu items (stubs) | 3 | `data-feature="cargo"` |
| Prep tab buttons | 6 | `data-tab="reveals"` |
| Modal close buttons | 6+ | `data-close-modal` |

## 3. Naming Convention Violations

| Current ID | Suggested Fix |
|------------|---------------|
| `btn-time-forward-10` | `btn-time-forward-10min` |
| `btn-time-forward-100` | `btn-time-forward-100min` |
| `btn-time-rewind-10` | `btn-time-rewind-10min` |
| `btn-time-rewind-100` | `btn-time-rewind-100min` |
| `travel-7d` | `travel-7days` |
| `travel-10d` | `travel-10days` |

## 4. Good Patterns (Keep)

The codebase follows consistent patterns for most IDs:

- `btn-*` prefix for buttons
- `bridge-*` for bridge elements
- `menu-*` for menu items
- `gm-*` for GM-only controls
- kebab-case throughout

## Recommendations

### Priority 1: Fix Critical Duplicates

```javascript
// Rename in index.html line 796:
// FROM: id="menu-library"
// TO:   id="menu-ship-library"

// Rename in app.js line 2697:
// FROM: id="system-map-container"
// TO:   id="system-map-runtime-container"
```

### Priority 2: Scope Form Field IDs

```html
<!-- Pattern: [modal-name]-[field-name] -->
<input id="add-crew-name">     <!-- In add crew modal -->
<input id="edit-crew-name">    <!-- In edit crew modal -->

<input id="add-contact-type">  <!-- In add contact modal -->
<input id="edit-contact-type"> <!-- In edit contact modal -->
```

### Priority 3: Add Missing IDs

For interactive elements without IDs, use pattern:
- Buttons: `btn-[action]-[target]`
- Inputs: `input-[context]-[field]`
- Panels: `panel-[name]`

### Testing

```javascript
// Check for duplicate IDs
const ids = document.querySelectorAll('[id]');
const counts = {};
ids.forEach(el => {
  counts[el.id] = (counts[el.id] || 0) + 1;
});
Object.entries(counts)
  .filter(([id, count]) => count > 1)
  .forEach(([id, count]) => console.warn(`Duplicate ID: ${id} (${count}x)`));
```

## Files Requiring Updates

| File | Issues |
|------|--------|
| `public/operations/index.html` | 29 duplicates, 87 missing IDs |
| `public/operations/modules/crew-roster-full.js` | 4 form field duplicates |
| `public/operations/modules/gm-reveals.js` | 6 form field duplicates |
| `public/operations/modules/email-app.js` | 2 button duplicates |
| `public/operations/modals/gm-bridge-menu.js` | 2 contact field duplicates |

---

*This audit identifies areas for improvement but does not require immediate action. Address when refactoring related code.*
