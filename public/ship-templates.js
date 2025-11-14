/**
 * Ship Templates Viewer
 * Loads and displays V2 ship templates with validation status
 * Uses defensive coding: optional chaining, null checks, error handling
 */

// State
let currentTemplates = [];

// UI State Management
function showLoading() {
  document.getElementById('loading-indicator').style.display = 'block';
  document.getElementById('error-display').classList.add('hidden');
  document.getElementById('templates-container').classList.add('hidden');
}

function hideLoading() {
  document.getElementById('loading-indicator').style.display = 'none';
}

function showError(message) {
  hideLoading();
  const errorDisplay = document.getElementById('error-display');
  const errorMessage = document.getElementById('error-message');
  errorMessage.textContent = message;
  errorDisplay.classList.remove('hidden');
}

function showContent() {
  hideLoading();
  document.getElementById('templates-container').classList.remove('hidden');
}

// Load all V2 ship templates with error handling
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
  const errors = [];

  for (const id of templateIds) {
    try {
      const response = await fetch(`/data/ships/v2/${id}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const template = await response.json();
      templates.push(template);
    } catch (err) {
      console.error(`Failed to load template "${id}":`, err);
      errors.push({ id, error: err.message });
      // Continue loading other templates
    }
  }

  if (templates.length === 0) {
    throw new Error('No templates could be loaded. Please check server is running and data files exist.');
  }

  if (errors.length > 0) {
    console.warn(`${errors.length} template(s) failed to load:`, errors);
  }

  return templates;
}

// Render table rows with safe property access
function renderTable(templates) {
  if (!templates || templates.length === 0) {
    showError('No templates to display');
    return;
  }

  const tbody = document.getElementById('ships-tbody');
  tbody.innerHTML = '';

  templates.forEach((template, index) => {
    const row = document.createElement('tr');
    row.dataset.templateIndex = index;

    // Safe property access with fallbacks
    const name = template.name ?? 'Unknown';
    const tonnage = template.tonnage ?? 0;
    const jumpRating = template.drives?.jump?.rating ?? 0;
    const thrust = template.drives?.manoeuvre?.thrust ?? template.thrust ?? 0;
    const techLevel = template.techLevel ?? 0;
    const cost = template.costs?.base ?? 0;
    const role = template.role ?? 'Unknown';

    row.innerHTML = `
      <td>${name}</td>
      <td>${tonnage}t</td>
      <td>J-${jumpRating}</td>
      <td>M-${thrust}</td>
      <td>TL${techLevel}</td>
      <td>MCr ${(cost / 1000000).toFixed(1)}</td>
      <td>${capitalize(role)}</td>
      <td class="status-${getStatusClass(template)}">
        ${getStatusIcon(template)} View
      </td>
    `;

    row.addEventListener('click', () => {
      selectTemplate(templates[index], row);
    });

    tbody.appendChild(row);
  });
}

// Get validation status class
function getStatusClass(template) {
  // Calculate jump-specific power requirements
  // During jump prep, assume fuel processor, M-drive, and weapons are shut down
  const basic = template.powerRequirements?.basic ?? 0;
  const jump = template.powerRequirements?.jump ?? 0;
  const sensors = template.powerRequirements?.sensors ?? 0;

  const jumpPowerRequired = basic + jump + sensors;
  const powerAvailable = template.power?.output ?? 0;

  // Only warn if jump operations exceed available power
  if (jumpPowerRequired > powerAvailable) {
    return 'warning';
  }

  return 'valid';
}

// Get status icon
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

// Render complete template details with null safety
function renderTemplateDetails(template) {
  if (!template) {
    return '<p>Template data not available</p>';
  }

  const name = template.className ?? template.name ?? 'Unknown';
  const tonnage = template.tonnage ?? 0;
  const techLevel = template.techLevel ?? 0;
  const statusIcon = getStatusIcon(template);
  const statusClass = getStatusClass(template);
  const statusText = statusClass === 'valid' ? 'Valid' : 'Warning';

  let html = `
    <h2>${name.toUpperCase()} (${tonnage}t, TL${techLevel})</h2>
    <p style="font-size: 1.1em; margin-bottom: 20px;">
      Status: ${statusIcon} <span class="status-${statusClass}">${statusText}</span>
    </p>
  `;

  // Propulsion & Power
  html += '<h3>PROPULSION & POWER</h3>';
  html += renderPropulsion(template);

  // Hull & Systems
  html += '<h3>HULL & SYSTEMS</h3>';
  html += renderHullGroup(template);

  // Accommodations
  if (template.staterooms || template.craft) {
    html += '<h3>ACCOMMODATIONS</h3>';
    html += renderAccommodations(template);
  }

  // Support Systems
  if (template.systems && template.systems.length > 0) {
    html += '<h3>SUPPORT SYSTEMS</h3>';
    html += renderSupportSystems(template);
  }

  // Weapons
  html += '<h3>WEAPONS</h3>';
  html += renderWeapons(template);

  // Validation Summary
  html += renderValidation(template);

  return html;
}

// Render propulsion section
function renderPropulsion(template) {
  const components = [];

  // Jump Drive
  if (template.drives?.jump) {
    const jump = template.drives.jump;
    components.push([
      `Jump Drive J-${jump.rating ?? 0}`,
      `${jump.tonnage ?? 0}t`,
      `MCr ${((jump.cost ?? 0) / 1000000).toFixed(1)}`,
      `${template.powerRequirements?.jump ?? 0} power`
    ]);
  }

  // Manoeuvre Drive
  if (template.drives?.manoeuvre) {
    const manoeuvre = template.drives.manoeuvre;
    components.push([
      `Manoeuvre Drive M-${manoeuvre.thrust ?? template.thrust ?? 0}`,
      `${manoeuvre.tonnage ?? 0}t`,
      `MCr ${((manoeuvre.cost ?? 0) / 1000000).toFixed(1)}`,
      `${template.powerRequirements?.manoeuvre ?? 0} power`
    ]);
  }

  // Power Plant
  if (template.power) {
    const power = template.power;
    const powerType = (power.type ?? 'fusion').replace(/_/g, ' ');
    components.push([
      `${capitalize(powerType)} Power Plant`,
      `${power.tonnage ?? 0}t`,
      `MCr ${((power.cost ?? 0) / 1000000).toFixed(1)}`,
      `${power.output ?? 0} output`
    ]);
  }

  // Fuel
  if (template.fuel) {
    const fuel = template.fuel;
    components.push([
      'Fuel (jump + power)',
      `${fuel.total ?? 0}t`,
      '—',
      '—'
    ]);
  }

  return renderComponentGroup(components);
}

// Render hull and systems section
function renderHullGroup(template) {
  if (!template.hull && !template.armour && !template.bridge) {
    return '<p>Hull data not available</p>';
  }

  const components = [];

  // Hull
  if (template.hull) {
    const hull = template.hull;
    const config = hull.configuration ?? 'standard';
    components.push([
      `${capitalize(config)} Hull`,
      `${hull.tonnage ?? 0}t`,
      `MCr ${((hull.cost ?? 0) / 1000000).toFixed(1)}`,
      '—'
    ]);
  }

  // Armour
  if (template.armour) {
    const armour = template.armour;
    const armourType = (armour.type ?? 'none').replace(/_/g, ' ');
    components.push([
      `${capitalize(armourType)} Armour-${armour.rating ?? 0}`,
      `${armour.tonnage ?? 0}t`,
      `MCr ${((armour.cost ?? 0) / 1000000).toFixed(1)}`,
      '—'
    ]);
  }

  // Bridge
  if (template.bridge) {
    const bridge = template.bridge;
    components.push([
      `${capitalize(bridge.type ?? 'standard')} Bridge`,
      `${bridge.tonnage ?? 0}t`,
      `MCr ${((bridge.cost ?? 0) / 1000000).toFixed(2)}`,
      '—'
    ]);
  }

  // Computer
  if (template.computer) {
    const computer = template.computer;
    components.push([
      computer.model ?? 'Computer',
      '0t',
      `MCr ${((computer.cost ?? 0) / 1000000).toFixed(2)}`,
      '—'
    ]);
  }

  // Sensors
  if (template.sensors) {
    const sensors = template.sensors;
    components.push([
      `${capitalize(sensors.grade ?? 'basic')} Sensors`,
      `${sensors.tonnage ?? 0}t`,
      `MCr ${((sensors.cost ?? 0) / 1000000).toFixed(1)}`,
      `${sensors.power ?? 0} power`
    ]);
  }

  return renderComponentGroup(components);
}

// Render accommodations section
function renderAccommodations(template) {
  const components = [];

  // Staterooms
  if (template.staterooms?.standard?.count) {
    const staterooms = template.staterooms.standard;
    components.push([
      `${staterooms.count}× Standard Staterooms`,
      `${staterooms.tonnage ?? 0}t`,
      `MCr ${((staterooms.cost ?? 0) / 1000000).toFixed(1)}`,
      '—'
    ]);
  }

  // Other stateroom types
  if (template.staterooms?.luxury?.count) {
    const luxury = template.staterooms.luxury;
    components.push([
      `${luxury.count}× Luxury Staterooms`,
      `${luxury.tonnage ?? 0}t`,
      `MCr ${((luxury.cost ?? 0) / 1000000).toFixed(1)}`,
      '—'
    ]);
  }

  // Craft
  if (template.craft && Array.isArray(template.craft)) {
    template.craft.forEach(c => {
      const craftName = c.craft?.name ?? c.type ?? 'Craft';
      components.push([
        `${craftName} + ${capitalize(c.type ?? 'docking').replace(/_/g, ' ')}`,
        `${c.tonnage ?? 0}t`,
        `MCr ${((c.cost ?? 0) / 1000000).toFixed(2)}`,
        '—'
      ]);
    });
  }

  if (components.length === 0) {
    return '<p>No accommodations</p>';
  }

  return renderComponentGroup(components);
}

// Render support systems section
function renderSupportSystems(template) {
  if (!template.systems || template.systems.length === 0) {
    return '<p>No support systems</p>';
  }

  const components = template.systems.map(sys => {
    const sysType = (sys.type ?? 'system').replace(/_/g, ' ');
    return [
      capitalize(sysType),
      `${sys.tonnage ?? 0}t`,
      `MCr ${((sys.cost ?? 0) / 1000000).toFixed(2)}`,
      `${sys.power ?? 0} power`
    ];
  });

  return renderComponentGroup(components);
}

// Render weapons section
function renderWeapons(template) {
  if (!template.weapons || template.weapons.length === 0) {
    return '<p>No weapons installed</p>';
  }

  const components = template.weapons.map((w, i) => {
    const mountType = (w.mount ?? 'turret').replace(/_/g, ' ');
    const weaponsList = w.weapons && w.weapons.length > 0
      ? ` (${w.weapons.join(', ')})`
      : ' (empty)';

    return [
      `${i + 1}× ${capitalize(mountType)}${weaponsList}`,
      `${w.tonnage ?? 0}t`,
      `MCr ${((w.cost ?? 0) / 1000000).toFixed(1)}`,
      `${w.power ?? 0} power`
    ];
  });

  return renderComponentGroup(components);
}

// Render validation summary
function renderValidation(template) {
  // Total power for all systems
  const powerRequired = template.powerRequirements?.total ?? 0;
  const powerAvailable = template.power?.output ?? 0;

  // Jump-specific power (fuel processor, M-drive, weapons shut down)
  const basic = template.powerRequirements?.basic ?? 0;
  const jump = template.powerRequirements?.jump ?? 0;
  const sensors = template.powerRequirements?.sensors ?? 0;
  const jumpPowerRequired = basic + jump + sensors;

  // Check if there's a real jump power deficit
  const hasJumpDeficit = jumpPowerRequired > powerAvailable;
  const statusClass = hasJumpDeficit ? 'warning' : 'valid';

  const tonnageUsed = calculateTonnageUsed(template);
  const fuelTonnage = template.fuel?.total ?? 0;
  const cargoTonnage = template.cargo?.tonnage ?? 0;
  const totalTonnage = template.tonnage ?? 0;
  const cost = template.costs?.base ?? 0;

  let html = `
    <div class="validation-summary ${statusClass}">
      <h3>VALIDATION</h3>
      <p><strong>TONNAGE:</strong> ${tonnageUsed}t allocated, ${fuelTonnage}t fuel, ${cargoTonnage}t cargo (${totalTonnage}t total)</p>
      <p><strong>POWER (All Systems):</strong> ${powerRequired} required, ${powerAvailable} available`;

  // Show total power status (not a warning, just info)
  if (powerRequired > powerAvailable) {
    html += ` <span style="color: var(--color-info)">ℹ️ (${powerRequired - powerAvailable} over during full operations)</span>`;
  }

  html += `</p>`;
  html += `<p><strong>POWER (Jump Prep):</strong> ${jumpPowerRequired} required (basic + jump + sensors)`;

  // Only warn if jump prep power exceeds available
  if (hasJumpDeficit) {
    const deficit = jumpPowerRequired - powerAvailable;
    html += ` <span style="color: var(--color-warning)">⚠️ Deficit: -${deficit} power</span>`;
  } else {
    html += ` <span style="color: var(--color-valid)">✅ Sufficient</span>`;
  }

  html += `</p>`;
  html += `<p><strong>COST:</strong> MCr ${(cost / 1000000).toFixed(1)} total</p>`;

  // Only show warning for actual jump power problems
  if (hasJumpDeficit) {
    const deficit = jumpPowerRequired - powerAvailable;
    html += `
      <p style="margin-top: 15px; padding: 10px; background-color: rgba(251, 191, 36, 0.1); border-left: 3px solid var(--color-warning);">
        ⚠️ <strong>Warning:</strong> Jump operations require ${deficit} more power than available<br>
        <span style="font-size: 0.9em; color: var(--color-text-dim);">
          Even with fuel processor, M-drive, and weapons shut down, this ship cannot safely execute jump.
          Consider upgrading the power plant.
        </span>
      </p>
    `;
  } else if (powerRequired > powerAvailable) {
    // Ship has enough for jump, but needs to manage power during normal ops
    html += `
      <p style="margin-top: 15px; padding: 10px; background-color: rgba(96, 165, 250, 0.1); border-left: 3px solid var(--color-info);">
        ℹ️ <strong>Note:</strong> Normal power management required<br>
        <span style="font-size: 0.9em; color: var(--color-text-dim);">
          During jump prep, fuel processor and M-drive are shut down (standard procedure).
          Ship has adequate power for all jump operations.
        </span>
      </p>
    `;
  }

  html += `</div>`;
  return html;
}

// Calculate total tonnage used (with complete component coverage)
function calculateTonnageUsed(template) {
  let total = 0;

  // Drives
  total += template.drives?.jump?.tonnage ?? 0;
  total += template.drives?.manoeuvre?.tonnage ?? 0;

  // Power plant
  total += template.power?.tonnage ?? 0;

  // Hull components
  total += template.armour?.tonnage ?? 0;
  total += template.bridge?.tonnage ?? 0;
  total += template.sensors?.tonnage ?? 0;

  // Accommodations
  total += template.staterooms?.standard?.tonnage ?? 0;
  total += template.staterooms?.luxury?.tonnage ?? 0;
  total += template.staterooms?.emergency?.tonnage ?? 0;

  // Craft
  if (template.craft && Array.isArray(template.craft)) {
    total += template.craft.reduce((sum, c) => sum + (c.tonnage ?? 0), 0);
  }

  // Systems
  if (template.systems && Array.isArray(template.systems)) {
    total += template.systems.reduce((sum, s) => sum + (s.tonnage ?? 0), 0);
  }

  // Weapons
  if (template.weapons && Array.isArray(template.weapons)) {
    total += template.weapons.reduce((sum, w) => sum + (w.tonnage ?? 0), 0);
  }

  return total;
}

// Render component group as grid
function renderComponentGroup(components) {
  if (!components || components.length === 0) {
    return '<p>No components</p>';
  }

  return components.map(([name, tons, cost, power]) => `
    <div class="component-line">
      <span>${name ?? '—'}</span>
      <span>${tons ?? '—'}</span>
      <span>${cost ?? '—'}</span>
      <span>${power ?? '—'}</span>
    </div>
  `).join('');
}

// Utility: Capitalize first letter
function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  showLoading();

  try {
    currentTemplates = await loadTemplates();
    renderTable(currentTemplates);
    showContent();
  } catch (err) {
    console.error('Failed to initialize ship templates:', err);
    showError(err.message);
  }
});
