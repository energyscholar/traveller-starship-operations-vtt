# Stage 12 Ship Builder - Minimal Spike Plan

**Created:** 2025-11-13
**Status:** APPROVED - Ready to Start
**Target:** Ship Template Viewer (Table View, Read-Only)
**Timeline:** ~5 hours (~1 week at hobby pace)

---

## 🎯 SCOPE: ULTRA-MINIMAL SPIKE

Build the **simplest possible** ship template viewer:
- Table showing 7 official templates
- Click row → expand to show component breakdown
- Validation status indicators
- Read-only (no editing, no saving)

**Goal:** Fast delivery, validate if this is useful, decide next steps based on feedback.

---

## 📋 FEATURES

### Must-Have:
1. ✅ Table view of 7 ships
2. ✅ Columns: Name, Tonnage, Jump, Thrust, Cost, Status
3. ✅ Click row → details expand below table
4. ✅ Detail view shows Standard level breakdown
5. ✅ Validation status (✅ Valid / ⚠️ Warning / 🔴 Error)
6. ✅ Tactical color scheme (green/amber/red/blue)

### Explicitly NOT Included:
- ❌ Card grid layout (too complex)
- ❌ Detail slider (defer)
- ❌ Editing (defer)
- ❌ Saving to localStorage (defer)
- ❌ Ship library (defer)
- ❌ JSON export/import (defer)

---

## 🎨 MOCKUP

```
┌────────────────────────────────────────────────────────────────────┐
│  TRAVELLER COMBAT VTT                                              │
│  ◄ Back to Menu              SHIP TEMPLATES                        │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  OFFICIAL HIGH GUARD TEMPLATES                                     │
├────────┬──────┬──────┬──────┬──────┬────────┬──────────┬──────────┤
│ Name   │ Tons │ Jump │ Mnvr │ TL   │ Cost   │ Role     │ Status   │
├────────┼──────┼──────┼──────┼──────┼────────┼──────────┼──────────┤
│ Scout  │ 100t │ J-2  │ M-2  │ TL12 │ MCr 37 │ Explore  │ ⚠️ View  │ ← Click to expand
│ Free T │ 200t │ J-1  │ M-1  │ TL10 │ MCr 37 │ Trading  │ ✅ View   │
│ Far Tr │ 200t │ J-2  │ M-1  │ TL11 │ MCr 53 │ Trading  │ ✅ View   │
│ Patrol │ 400t │ J-3  │ M-5  │ TL14 │ MCr215 │ Military │ ✅ View   │
│ Merc C │ 800t │ J-2  │ M-4  │ TL12 │ MCr347 │ Military │ ✅ View   │
│ Liner  │ 600t │ J-1  │ M-1  │ TL10 │ MCr217 │ Passenger│ ✅ View   │
│ Safari │ 200t │ J-2  │ M-2  │ TL12 │ MCr 87 │ Explore  │ ✅ View   │
└────────┴──────┴──────┴──────┴──────┴────────┴──────────┴──────────┘

─── SCOUT DETAILS ───────────────────────────────────────────────────

TYPE-S SCOUT (100t, TL12)                              Status: ⚠️ Warning

PROPULSION & POWER (33t, MCr 27.5)
  Jump Drive J-2          10t      MCr 15.0      20 power
  Manoeuvre Drive M-2      2t      MCr  4.0      20 power
  Fusion Power Plant TL12  4t      MCr  4.0      60 output
  Fuel (jump + power)     23t      —             —

HULL & SYSTEMS (18t, MCr 11.7)
  Streamlined Hull       100t      MCr  6.0      —
  Crystaliron Armour-4     6t      MCr  1.2      —
  Standard Bridge         10t      MCr  0.5      —
  Computer/5bis            0t      MCr  0.05     —
  Military Sensors         2t      MCr  4.1       2 power

ACCOMMODATIONS (21t, MCr 3.25)
  4× Standard Staterooms  16t      MCr  2.0      —
  Air/Raft + Docking       5t      MCr  1.25     —

SUPPORT SYSTEMS (8t, MCr 1.0)
  Fuel Processor           2t      MCr  0.1       2 power
  Workshop                 6t      MCr  0.9      —

WEAPONS (1t, MCr 0.5)
  1× Double Turret         1t      MCr  0.5       0 power

─────────────────────────────────────────────────────────────────────

TONNAGE: 81t allocated, 19t fuel, 0t cargo (100t total)
POWER: 64 required, 60 available ⚠️ Deficit: -4 power
COST: MCr 36.9 total

VALIDATION:
  ⚠️ 1 Warning
  • Power deficit: 64 required, 60 available (-4)
    Solution: Shut down fuel processor during jump (standard for Type-S)

  ℹ️ 2 Recommendations
  • Consider upgrading to improved sensors for TL12
  • Fuel processor has 2× capacity (40 tons/day)

─────────────────────────────────────────────────────────────────────

[Click another row to view its details]
```

---

## 🏗️ IMPLEMENTATION TASKS

### Task 1: Create HTML Page (1 hour)
**File:** `public/ship-templates.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ship Templates - Traveller Combat VTT</title>
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/ship-templates.css">
</head>
<body>
  <header>
    <nav>
      <a href="index.html">◄ Back to Menu</a>
      <h1>Ship Templates</h1>
    </nav>
  </header>

  <main id="templates-container">
    <section id="template-table">
      <h2>Official High Guard Templates</h2>
      <table id="ships-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Tonnage</th>
            <th>Jump</th>
            <th>Manoeuvre</th>
            <th>TL</th>
            <th>Cost</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="ships-tbody">
          <!-- Populated by JavaScript -->
        </tbody>
      </table>
    </section>

    <section id="ship-details" class="hidden">
      <!-- Populated when user clicks row -->
    </section>
  </main>

  <script type="module" src="js/ship-templates.js"></script>
</body>
</html>
```

---

### Task 2: Create CSS (1 hour)
**File:** `public/css/ship-templates.css`

```css
/* Tactical color scheme */
:root {
  --color-valid: #4ade80;    /* Green */
  --color-warning: #fbbf24;  /* Amber */
  --color-error: #f87171;    /* Red */
  --color-info: #60a5fa;     /* Blue */
  --color-bg-dark: #1a1a2e;
  --color-text: #e5e7eb;
}

body {
  background-color: var(--color-bg-dark);
  color: var(--color-text);
  font-family: 'Courier New', monospace;
}

/* Table styling */
#ships-table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
}

#ships-table th {
  background-color: #2a2a3e;
  padding: 1rem;
  text-align: left;
  border-bottom: 2px solid #4a4a5e;
}

#ships-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #3a3a4e;
}

#ships-table tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;
}

#ships-table tbody tr:hover {
  background-color: #2a2a3e;
}

#ships-table tbody tr.selected {
  background-color: #3a3a5e;
  border-left: 3px solid var(--color-info);
}

/* Status badges */
.status-valid { color: var(--color-valid); }
.status-warning { color: var(--color-warning); }
.status-error { color: var(--color-error); }

/* Detail view */
#ship-details {
  margin: 2rem 0;
  padding: 2rem;
  background-color: #2a2a3e;
  border: 1px solid #4a4a5e;
  border-radius: 4px;
}

#ship-details h2 {
  color: var(--color-info);
  margin-bottom: 1rem;
}

#ship-details h3 {
  color: var(--color-text);
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #4a4a5e;
  padding-bottom: 0.5rem;
}

.component-line {
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1fr;
  padding: 0.25rem 0;
  font-family: 'Courier New', monospace;
}

.validation-summary {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #1a1a2e;
  border-left: 3px solid var(--color-warning);
}

.validation-summary.valid {
  border-left-color: var(--color-valid);
}

.validation-summary.error {
  border-left-color: var(--color-error);
}

.hidden {
  display: none;
}
```

---

### Task 3: Load Templates (1 hour)
**File:** `public/js/ship-templates.js`

```javascript
// Load all V2 ship templates
async function loadTemplates() {
  const templateIds = [
    'scout',
    'free_trader',
    'far_trader',
    'patrol_corvette',
    'mercenary_cruiser',
    'subsidised_liner',
    'safari_ship'
  ];

  const templates = [];
  for (const id of templateIds) {
    const response = await fetch(`data/ships/v2/${id}.json`);
    const template = await response.json();
    templates.push(template);
  }

  return templates;
}

// Render table rows
function renderTable(templates) {
  const tbody = document.getElementById('ships-tbody');
  tbody.innerHTML = '';

  templates.forEach((template, index) => {
    const row = document.createElement('tr');
    row.dataset.templateIndex = index;
    row.innerHTML = `
      <td>${template.name}</td>
      <td>${template.tonnage}t</td>
      <td>J-${template.drives?.jump?.rating || 0}</td>
      <td>M-${template.drives?.manoeuvre?.thrust || 0}</td>
      <td>TL${template.techLevel}</td>
      <td>MCr ${(template.costs.base / 1000000).toFixed(1)}</td>
      <td>${template.role}</td>
      <td class="status-${getStatusClass(template)}">
        ${getStatusIcon(template)} View
      </td>
    `;

    row.addEventListener('click', () => {
      selectTemplate(template, row);
    });

    tbody.appendChild(row);
  });
}

// Get validation status
function getStatusClass(template) {
  // Check for power deficit (Scout and Free Trader have warnings)
  const powerRequired = template.powerRequirements?.total || 0;
  const powerAvailable = template.power?.output || 0;

  if (powerRequired > powerAvailable) return 'warning';
  return 'valid';
}

function getStatusIcon(template) {
  const status = getStatusClass(template);
  if (status === 'valid') return '✅';
  if (status === 'warning') return '⚠️';
  return '🔴';
}

// Display selected template details
function selectTemplate(template, row) {
  // Highlight selected row
  document.querySelectorAll('#ships-tbody tr').forEach(r => {
    r.classList.remove('selected');
  });
  row.classList.add('selected');

  // Render details
  const detailsSection = document.getElementById('ship-details');
  detailsSection.classList.remove('hidden');
  detailsSection.innerHTML = renderTemplateDetails(template);

  // Scroll to details
  detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Render template details (Standard level)
function renderTemplateDetails(template) {
  return `
    <h2>${template.className.toUpperCase()} (${template.tonnage}t, TL${template.techLevel})</h2>
    <p>Status: ${getStatusIcon(template)} ${getStatusClass(template) === 'valid' ? 'Valid' : 'Warning'}</p>

    <h3>PROPULSION & POWER</h3>
    ${renderComponentGroup([
      ['Jump Drive J-' + (template.drives?.jump?.rating || 0),
        template.drives?.jump?.tonnage + 't',
        'MCr ' + ((template.drives?.jump?.cost || 0) / 1000000).toFixed(1),
        (template.powerRequirements?.jump || 0) + ' power'],
      ['Manoeuvre Drive M-' + (template.drives?.manoeuvre?.thrust || 0),
        template.drives?.manoeuvre?.tonnage + 't',
        'MCr ' + ((template.drives?.manoeuvre?.cost || 0) / 1000000).toFixed(1),
        (template.powerRequirements?.manoeuvre || 0) + ' power'],
      [template.power?.type?.replace(/_/g, ' ') + ' Power Plant',
        template.power?.tonnage + 't',
        'MCr ' + ((template.power?.cost || 0) / 1000000).toFixed(1),
        template.power?.output + ' output'],
      ['Fuel (jump + power)',
        template.fuel?.total + 't',
        '—',
        '—']
    ])}

    <h3>HULL & SYSTEMS</h3>
    ${renderHullGroup(template)}

    <h3>ACCOMMODATIONS</h3>
    ${renderAccommodations(template)}

    <h3>WEAPONS</h3>
    ${renderWeapons(template)}

    ${renderValidation(template)}
  `;
}

function renderComponentGroup(components) {
  return components.map(([name, tons, cost, power]) => `
    <div class="component-line">
      <span>${name}</span>
      <span>${tons}</span>
      <span>${cost}</span>
      <span>${power}</span>
    </div>
  `).join('');
}

function renderHullGroup(template) {
  const components = [
    [template.hull.configuration + ' Hull',
      template.hull.tonnage + 't',
      'MCr ' + (template.hull.cost / 1000000).toFixed(1),
      '—'],
    [template.armour.type.replace(/_/g, ' ') + ' Armour-' + template.armour.rating,
      template.armour.tonnage + 't',
      'MCr ' + (template.armour.cost / 1000000).toFixed(1),
      '—'],
    [template.bridge.type + ' Bridge',
      template.bridge.tonnage + 't',
      'MCr ' + (template.bridge.cost / 1000000).toFixed(1),
      '—'],
    [template.computer.model,
      '0t',
      'MCr ' + (template.computer.cost / 1000000).toFixed(2),
      '—'],
    [template.sensors.grade + ' Sensors',
      template.sensors.tonnage + 't',
      'MCr ' + (template.sensors.cost / 1000000).toFixed(1),
      template.sensors.power + ' power']
  ];
  return renderComponentGroup(components);
}

function renderAccommodations(template) {
  const components = [];
  if (template.staterooms?.standard?.count) {
    components.push([
      template.staterooms.standard.count + '× Standard Staterooms',
      template.staterooms.standard.tonnage + 't',
      'MCr ' + (template.staterooms.standard.cost / 1000000).toFixed(1),
      '—'
    ]);
  }
  // Add craft, etc.
  return renderComponentGroup(components);
}

function renderWeapons(template) {
  if (!template.weapons || template.weapons.length === 0) {
    return '<p>No weapons installed</p>';
  }
  const components = template.weapons.map((w, i) => [
    (i + 1) + '× ' + w.mount.replace(/_/g, ' '),
    w.tonnage + 't',
    'MCr ' + (w.cost / 1000000).toFixed(1),
    w.power + ' power'
  ]);
  return renderComponentGroup(components);
}

function renderValidation(template) {
  const powerRequired = template.powerRequirements?.total || 0;
  const powerAvailable = template.power?.output || 0;
  const isValid = powerRequired <= powerAvailable;

  const statusClass = isValid ? 'valid' : 'warning';

  let validationHTML = `
    <div class="validation-summary ${statusClass}">
      <h3>VALIDATION</h3>
      <p><strong>TONNAGE:</strong> ${calculateTonnageUsed(template)}t allocated, ${template.fuel?.total || 0}t fuel, ${template.cargo?.tonnage || 0}t cargo (${template.tonnage}t total)</p>
      <p><strong>POWER:</strong> ${powerRequired} required, ${powerAvailable} available`;

  if (!isValid) {
    validationHTML += ` ⚠️ <span style="color: var(--color-warning)">Deficit: -${powerRequired - powerAvailable} power</span>`;
  }

  validationHTML += `</p><p><strong>COST:</strong> MCr ${(template.costs.base / 1000000).toFixed(1)} total</p>`;

  if (!isValid) {
    validationHTML += `
      <p style="margin-top: 1rem; color: var(--color-warning);">
        ⚠️ <strong>Warning:</strong> Power deficit<br>
        Solution: Shut down fuel processor and non-essential systems during jump operations.
        This is a known design constraint of this template.
      </p>
    `;
  }

  validationHTML += `</div>`;
  return validationHTML;
}

function calculateTonnageUsed(template) {
  let total = 0;
  if (template.drives?.jump) total += template.drives.jump.tonnage;
  if (template.drives?.manoeuvre) total += template.drives.manoeuvre.tonnage;
  if (template.power) total += template.power.tonnage;
  if (template.armour) total += template.armour.tonnage;
  if (template.bridge) total += template.bridge.tonnage;
  if (template.sensors) total += template.sensors.tonnage;
  if (template.staterooms?.standard) total += template.staterooms.standard.tonnage;
  if (template.weapons) {
    total += template.weapons.reduce((sum, w) => sum + w.tonnage, 0);
  }
  return total;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  const templates = await loadTemplates();
  renderTable(templates);
});
```

---

### Task 4: Link from Main Menu (0.5 hours)
**File:** `public/index.html`

Add link to ship templates page:
```html
<nav>
  <a href="space-combat.html">Space Combat</a>
  <a href="ship-templates.html">Ship Templates</a> <!-- NEW -->
  <!-- other links -->
</nav>
```

---

### Task 5: Test & Polish (1.5 hours)
- Test in Chrome, Firefox, Safari
- Fix any rendering issues
- Ensure all 7 templates load
- Verify validation status correct
- Add loading state
- Handle errors gracefully

---

## ⏱️ TIME BREAKDOWN

| Task | Description | Time |
|------|-------------|------|
| 1 | Create HTML page | 1h |
| 2 | Create CSS (tactical colors) | 1h |
| 3 | Load & render templates | 1.5h |
| 4 | Link from main menu | 0.5h |
| 5 | Test & polish | 1h |
| **TOTAL** | **Minimal Spike** | **5h** |

**At hobby pace (2-3 hours/session):**
- Best case: 2 sessions (2-3 days)
- Realistic: 3 sessions (~1 week)

---

## ✅ SUCCESS CRITERIA

**Minimal spike is successful when:**
- ✅ Page loads and shows 7 templates in table
- ✅ Click any row → details expand below
- ✅ Validation status shows correctly (Scout & Free Trader = ⚠️, others = ✅)
- ✅ Tactical color scheme applied
- ✅ All component data displays correctly
- ✅ Works in Chrome/Firefox/Safari

---

## 🎯 WHAT HAPPENS NEXT

After completing minimal spike, **stop and evaluate:**

### Option 1: Ship It As-Is
If table view is useful enough, consider this "done" for now. Move to other priorities.

### Option 2: Enhance UI
Add card grid layout, make it prettier. Keep read-only.

### Option 3: Add Editing
Now that foundation exists, add inline editing capability.

### Option 4: Add Detail Slider
Add Simple/Standard/Technical toggle for progressive disclosure.

**Decision point:** Based on user feedback and actual use.

---

## 📝 NOTES

- **No validation module calls needed** - templates already have validation results in JSON
- **No localStorage** - completely stateless, just loads and displays
- **No frameworks** - pure vanilla JS, minimal dependencies
- **No testing harness** - manual testing only for MVP
- **Future-proof** - can enhance later without rewriting

---

## 🚀 READY TO START?

**Next Steps:**
1. Create `public/ship-templates.html`
2. Create `public/css/ship-templates.css`
3. Create `public/js/ship-templates.js`
4. Link from main menu
5. Test with all 7 templates
6. Ship it!

**Estimated completion:** ~1 week at hobby pace

---

**STATUS:** ✅ APPROVED - Ready to implement
**Target:** Ship template table viewer
**Timeline:** ~5 hours / ~1 week
**Next:** Start Task 1 (create HTML page)
