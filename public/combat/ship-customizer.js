// ======== SHIP CUSTOMIZER - STAGE 12.3 ========
// SVG-based ship customization interface

// Ship template data (loaded from JSON files)
let shipTemplates = {};
let currentTemplate = 'scout';
let currentModifications = {};
let selectedComponent = null;

// ======== INITIALIZATION ========

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[CUSTOMIZER] Initializing ship customizer...');

  // Load ship templates
  await loadShipTemplates();

  // Set up event listeners
  setupEventListeners();

  // Load initial ship (Scout)
  loadShipTemplate('scout');

  console.log('[CUSTOMIZER] Initialization complete');
});

// ======== SHIP TEMPLATE LOADING ========

async function loadShipTemplates() {
  try {
    const response = await fetch('/data/ships/index.json');
    const index = await response.json();

    // Handle both array of strings and array of objects
    const shipIds = index.ships.map(ship => typeof ship === 'string' ? ship : ship.id);

    for (const shipId of shipIds) {
      const shipResponse = await fetch(`/data/ships/${shipId}.json`);
      const shipData = await shipResponse.json();
      shipTemplates[shipId] = shipData;
    }

    console.log('[CUSTOMIZER] Loaded ship templates:', Object.keys(shipTemplates));
  } catch (error) {
    console.error('[CUSTOMIZER] Failed to load ship templates:', error);
  }
}

function loadShipTemplate(templateId) {
  const template = shipTemplates[templateId];
  if (!template) {
    console.error('[CUSTOMIZER] Template not found:', templateId);
    return;
  }

  currentTemplate = templateId;
  currentModifications = {}; // Reset modifications
  selectedComponent = null;

  // Update UI
  updateSchematicTitle(template);
  renderShipSVG(template);
  updateCostDisplay(template);
  clearComponentPanel();

  console.log('[CUSTOMIZER] Loaded template:', templateId);
}

// ======== SVG GENERATION ========

function renderShipSVG(template) {
  const container = document.getElementById('ship-schematic-display');
  const svg = generateShipSVG(template);
  container.innerHTML = svg;

  // Add click listeners to clickable components
  const clickableComponents = container.querySelectorAll('.clickable-component');
  clickableComponents.forEach(component => {
    component.addEventListener('click', (e) => {
      e.stopPropagation();
      const componentType = component.getAttribute('data-component');
      const componentId = component.getAttribute('data-component-id');
      handleComponentClick(componentType, componentId, component);
    });
  });

  console.log('[CUSTOMIZER] SVG rendered for:', template.id);
}

function generateShipSVG(template) {
  const shipId = template.id;

  // SVG generators for each ship type
  const svgGenerators = {
    scout: generateScoutSVG,
    free_trader: generateFreeTraderSVG,
    far_trader: generateFarTraderSVG,
    patrol_corvette: generatePatrolCorvetteSVG,
    mercenary_cruiser: generateMercenaryCruiserSVG,
    subsidised_liner: generateSubsidisedLinerSVG,
    safari_ship: generateSafariShipSVG,
    seeker: generateSeekerSVG,
    laboratory_ship: generateLaboratoryShipSVG
  };

  const generator = svgGenerators[shipId];
  if (!generator) {
    console.warn('[CUSTOMIZER] No SVG generator for:', shipId);
    return generateGenericSVG(template);
  }

  return generator(template);
}

// ======== SVG TEMPLATES FOR EACH SHIP ========

function generateScoutSVG(template) {
  const turretCount = template.turrets ? template.turrets.length : 1;

  return `
    <svg class="ship-svg" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
      <!-- Ship hull outline -->
      <polygon points="150,20 250,100 250,300 150,380 50,300 50,100"
               fill="#1a1a2e" stroke="#16213e" stroke-width="2"/>

      <!-- Turret 1 (front) -->
      <circle id="turret1" cx="150" cy="80" r="25"
              fill="${turretCount >= 1 ? '#0f3460' : '#2a2a2a'}"
              stroke="${turretCount >= 1 ? '#667eea' : '#444'}" stroke-width="2"
              class="clickable-component" data-component="turret" data-component-id="turret1"/>
      <text x="150" y="82" class="component-label">Turret 1</text>
      <text x="150" y="95" class="component-sublabel">${getTurretLabel(template, 0)}</text>

      <!-- Cargo Bay (middle-left) -->
      <rect id="cargo" x="70" y="180" width="70" height="60"
            fill="#533483" stroke="#f5576c" stroke-width="2"
            class="clickable-component" data-component="cargo" data-component-id="cargo"/>
      <text x="105" y="210" class="component-label">Cargo</text>
      <text x="105" y="223" class="component-sublabel">${template.cargo || 20}t</text>

      <!-- Fuel (middle-right) -->
      <rect id="fuel" x="160" y="180" width="70" height="60"
            fill="#533483" stroke="#f5576c" stroke-width="2"
            class="clickable-component" data-component="fuel" data-component-id="fuel"/>
      <text x="195" y="210" class="component-label">Fuel</text>
      <text x="195" y="223" class="component-sublabel">${template.fuel || 20}t</text>

      <!-- M-Drive (rear-left) -->
      <rect id="m-drive" x="85" y="310" width="55" height="40"
            fill="#e94560" stroke="#667eea" stroke-width="2"
            class="clickable-component" data-component="m-drive" data-component-id="m-drive"/>
      <text x="112" y="330" class="component-label">M-Drive</text>
      <text x="112" y="343" class="component-sublabel">Thrust ${template.thrust || 2}</text>

      <!-- J-Drive (rear-right) -->
      <rect id="j-drive" x="160" y="310" width="55" height="40"
            fill="#e94560" stroke="#667eea" stroke-width="2"
            class="clickable-component" data-component="j-drive" data-component-id="j-drive"/>
      <text x="187" y="330" class="component-label">J-Drive</text>
      <text x="187" y="343" class="component-sublabel">Jump ${template.jump || 2}</text>
    </svg>
  `;
}

function generateFreeTraderSVG(template) {
  const turretCount = template.turrets ? template.turrets.length : 2;

  return `
    <svg class="ship-svg" viewBox="0 0 350 450" xmlns="http://www.w3.org/2000/svg">
      <!-- Ship hull (rectangular merchant) -->
      <rect x="75" y="30" width="200" height="390"
            fill="#1a1a2e" stroke="#16213e" stroke-width="2" rx="10"/>

      <!-- Turret 1 (front-left) -->
      <circle cx="130" cy="70" r="22"
              fill="${turretCount >= 1 ? '#0f3460' : '#2a2a2a'}"
              stroke="${turretCount >= 1 ? '#667eea' : '#444'}" stroke-width="2"
              class="clickable-component" data-component="turret" data-component-id="turret1"/>
      <text x="130" y="73" class="component-label">T1</text>
      <text x="130" y="85" class="component-sublabel">${getTurretLabel(template, 0)}</text>

      <!-- Turret 2 (front-right) -->
      <circle cx="220" cy="70" r="22"
              fill="${turretCount >= 2 ? '#0f3460' : '#2a2a2a'}"
              stroke="${turretCount >= 2 ? '#667eea' : '#444'}" stroke-width="2"
              class="clickable-component" data-component="turret" data-component-id="turret2"/>
      <text x="220" y="73" class="component-label">T2</text>
      <text x="220" y="85" class="component-sublabel">${getTurretLabel(template, 1)}</text>

      <!-- Cargo Bay -->
      <rect x="95" y="150" width="80" height="140"
            fill="#533483" stroke="#f5576c" stroke-width="2"
            class="clickable-component" data-component="cargo" data-component-id="cargo"/>
      <text x="135" y="220" class="component-label">Cargo</text>
      <text x="135" y="233" class="component-sublabel">${template.cargo || 82}t</text>

      <!-- Fuel -->
      <rect x="185" y="150" width="80" height="140"
            fill="#533483" stroke="#f5576c" stroke-width="2"
            class="clickable-component" data-component="fuel" data-component-id="fuel"/>
      <text x="225" y="220" class="component-label">Fuel</text>
      <text x="225" y="233" class="component-sublabel">${template.fuel || 40}t</text>

      <!-- M-Drive -->
      <rect x="95" y="350" width="70" height="50"
            fill="#e94560" stroke="#667eea" stroke-width="2"
            class="clickable-component" data-component="m-drive" data-component-id="m-drive"/>
      <text x="130" y="375" class="component-label">M-Drive</text>
      <text x="130" y="388" class="component-sublabel">Thrust ${template.thrust || 1}</text>

      <!-- J-Drive -->
      <rect x="185" y="350" width="70" height="50"
            fill="#e94560" stroke="#667eea" stroke-width="2"
            class="clickable-component" data-component="j-drive" data-component-id="j-drive"/>
      <text x="220" y="375" class="component-label">J-Drive</text>
      <text x="220" y="388" class="component-sublabel">Jump ${template.jump || 1}</text>
    </svg>
  `;
}

// Generic SVG for ships without custom templates
function generateGenericSVG(template) {
  const turretCount = template.turrets ? template.turrets.length : 0;
  const tonnage = template.tonnage || 100;

  // Scale ship based on tonnage
  const width = Math.min(250, 150 + (tonnage / 10));
  const height = Math.min(450, 300 + (tonnage / 5));

  return `
    <svg class="ship-svg" viewBox="0 0 ${width + 100} ${height + 50}" xmlns="http://www.w3.org/2000/svg">
      <!-- Ship hull -->
      <rect x="50" y="30" width="${width}" height="${height}"
            fill="#1a1a2e" stroke="#16213e" stroke-width="2" rx="10"/>

      <!-- Turrets (max 4 displayed) -->
      ${Array.from({ length: Math.min(turretCount, 4) }, (_, i) => {
        const x = 50 + width / 5 + (i * width / 5);
        return `
          <circle cx="${x}" cy="70" r="20"
                  fill="#0f3460" stroke="#667eea" stroke-width="2"
                  class="clickable-component" data-component="turret" data-component-id="turret${i + 1}"/>
          <text x="${x}" y="73" class="component-label">T${i + 1}</text>
        `;
      }).join('')}

      <!-- Cargo & Fuel -->
      <rect x="${50 + width / 4}" y="${height / 2}" width="${width / 3}" height="${height / 3}"
            fill="#533483" stroke="#f5576c" stroke-width="2"
            class="clickable-component" data-component="cargo" data-component-id="cargo"/>
      <text x="${50 + width / 2}" y="${height / 2 + height / 6}" class="component-label">Cargo</text>

      <!-- M-Drive -->
      <rect x="${50 + width / 4}" y="${height - 70}" width="${width / 3}" height="50"
            fill="#e94560" stroke="#667eea" stroke-width="2"
            class="clickable-component" data-component="m-drive" data-component-id="m-drive"/>
      <text x="${50 + width / 2}" y="${height - 40}" class="component-label">M-Drive</text>

      <text x="${50 + width / 2}" y="${height + 30}" class="component-label" style="font-size: 14px; fill: #aaa;">
        ${template.name} (${tonnage}t)
      </text>
    </svg>
  `;
}

// Simplified generators for other ships (using generic for now)
function generateFarTraderSVG(template) { return generateGenericSVG(template); }
function generatePatrolCorvetteSVG(template) { return generateGenericSVG(template); }
function generateMercenaryCruiserSVG(template) { return generateGenericSVG(template); }
function generateSubsidisedLinerSVG(template) { return generateGenericSVG(template); }
function generateSafariShipSVG(template) { return generateGenericSVG(template); }
function generateSeekerSVG(template) { return generateGenericSVG(template); }
function generateLaboratoryShipSVG(template) { return generateGenericSVG(template); }

// ======== HELPER FUNCTIONS ========

function getTurretLabel(template, index) {
  if (!template.turrets || !template.turrets[index]) {
    return 'Empty';
  }

  const turret = template.turrets[index];
  const typeLabel = turret.type.charAt(0).toUpperCase() + turret.type.slice(1);
  const weaponCount = turret.weapons ? turret.weapons.length : 0;

  return `${typeLabel} (${weaponCount})`;
}

function updateSchematicTitle(template) {
  const title = document.getElementById('ship-schematic-title');
  title.textContent = `${template.name} (${template.tonnage}t ${template.role})`;
}

function updateCostDisplay(template, modifications = null) {
  const mods = modifications || currentModifications;
  const baseCost = template.cost ? (template.cost / 1000000) : 0;

  // Use ShipCosts module to calculate modification cost
  const modCostCredits = ShipCosts.calculateModificationCost(template, mods);
  const modCost = modCostCredits / 1000000;
  const totalCost = baseCost + modCost;

  document.getElementById('base-cost').textContent = `MCr ${baseCost.toFixed(2)}`;
  document.getElementById('mod-cost').textContent = `+ MCr ${modCost.toFixed(2)}`;
  document.getElementById('total-cost').textContent = `MCr ${totalCost.toFixed(2)}`;
}

function calculateModificationCost() {
  // Use ShipCosts module
  const template = shipTemplates[currentTemplate];
  const costCredits = ShipCosts.calculateModificationCost(template, currentModifications);
  return costCredits / 1000000;
}

// ======== COMPONENT INTERACTION ========

function handleComponentClick(componentType, componentId, element) {
  console.log('[CUSTOMIZER] Component clicked:', componentType, componentId);

  // Remove previous selection
  document.querySelectorAll('.clickable-component').forEach(el => {
    el.classList.remove('selected');
  });

  // Add selection to clicked component
  element.classList.add('selected');
  selectedComponent = { type: componentType, id: componentId };

  // Show component panel
  showComponentPanel(componentType, componentId);
}

function showComponentPanel(componentType, componentId) {
  const panel = document.getElementById('component-panel-content');
  const template = shipTemplates[currentTemplate];

  let panelHTML = '';

  switch (componentType) {
    case 'turret':
      panelHTML = generateTurretPanel(componentId, template);
      break;
    case 'cargo':
      panelHTML = generateCargoPanel(template);
      break;
    case 'fuel':
      panelHTML = generateFuelPanel(template);
      break;
    case 'm-drive':
      panelHTML = generateMDrivePanel(template);
      break;
    case 'j-drive':
      panelHTML = generateJDrivePanel(template);
      break;
    default:
      panelHTML = '<p>Component customization coming soon!</p>';
  }

  panel.innerHTML = panelHTML;
  panel.classList.add('component-panel-active');
}

function generateTurretPanel(turretId, template) {
  // Get existing turret configuration or defaults
  const existingTurret = currentModifications.turrets?.find(t => t.id === turretId);
  const turretType = existingTurret?.type || 'single';
  const weapons = existingTurret?.weapons || [];

  // Calculate current turret cost
  const turretCost = ShipCosts.calculateSingleTurretCost(turretType, weapons);
  const turretCostMCr = (turretCost / 1000000).toFixed(2);

  return `
    <div class="panel-header">
      <div class="panel-title">🎯 ${turretId.toUpperCase()}</div>
      <button class="panel-close" onclick="clearComponentPanel()">×</button>
    </div>
    <div class="panel-body">
      <div class="form-group">
        <label for="turret-type-${turretId}">Turret Type:</label>
        <select id="turret-type-${turretId}" onchange="updateTurretWeaponSlots('${turretId}')">
          <option value="single" ${turretType === 'single' ? 'selected' : ''}>Single (1 weapon) - MCr 0.2</option>
          <option value="double" ${turretType === 'double' ? 'selected' : ''}>Double (2 weapons) - MCr 0.5</option>
          <option value="triple" ${turretType === 'triple' ? 'selected' : ''}>Triple (3 weapons) - MCr 1.0</option>
        </select>
      </div>

      <div id="weapon-slots-${turretId}">
        ${generateWeaponSlots(turretId, turretType, weapons)}
      </div>

      <div class="component-cost" style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 4px;">
        <span class="component-cost-label">Turret Cost:</span>
        <span class="component-cost-value" id="turret-cost-${turretId}">MCr ${turretCostMCr}</span>
      </div>

      <button class="action-button primary" onclick="applyTurretChanges('${turretId}')" style="margin-top: 15px; width: 100%;">
        Apply Changes
      </button>
    </div>
  `;
}

function generateWeaponSlots(turretId, turretType, currentWeapons) {
  const capacity = ShipCustomization.getTurretCapacity(turretType);
  let html = '';

  for (let i = 0; i < capacity; i++) {
    const weaponValue = currentWeapons[i] || '';
    html += `
      <div class="form-group">
        <label for="weapon-${turretId}-${i}">Weapon ${i + 1}:</label>
        <select id="weapon-${turretId}-${i}" onchange="updateTurretCost('${turretId}')">
          <option value="">-- Empty --</option>
          <option value="pulse_laser" ${weaponValue === 'pulse_laser' ? 'selected' : ''}>Pulse Laser - MCr 1.0</option>
          <option value="beam_laser" ${weaponValue === 'beam_laser' ? 'selected' : ''}>Beam Laser - MCr 0.5</option>
          <option value="missile_rack" ${weaponValue === 'missile_rack' ? 'selected' : ''}>Missile Rack - MCr 0.75</option>
          <option value="sandcaster" ${weaponValue === 'sandcaster' ? 'selected' : ''}>Sandcaster - MCr 0.25</option>
          <option value="particle_beam" ${weaponValue === 'particle_beam' ? 'selected' : ''}>Particle Beam - MCr 4.0</option>
          <option value="railgun" ${weaponValue === 'railgun' ? 'selected' : ''}>Railgun - MCr 2.0</option>
        </select>
      </div>
    `;
  }

  return html;
}

function updateTurretWeaponSlots(turretId) {
  const turretTypeSelect = document.getElementById(`turret-type-${turretId}`);
  const turretType = turretTypeSelect.value;

  // Get current weapons before regenerating
  const existingTurret = currentModifications.turrets?.find(t => t.id === turretId);
  const currentWeapons = existingTurret?.weapons || [];

  // Regenerate weapon slots
  const weaponSlotsContainer = document.getElementById(`weapon-slots-${turretId}`);
  weaponSlotsContainer.innerHTML = generateWeaponSlots(turretId, turretType, currentWeapons);

  // Update cost display
  updateTurretCost(turretId);
}

function updateTurretCost(turretId) {
  const turretTypeSelect = document.getElementById(`turret-type-${turretId}`);
  const turretType = turretTypeSelect.value;

  // Collect weapons
  const capacity = ShipCustomization.getTurretCapacity(turretType);
  const weapons = [];
  for (let i = 0; i < capacity; i++) {
    const weaponSelect = document.getElementById(`weapon-${turretId}-${i}`);
    if (weaponSelect && weaponSelect.value) {
      weapons.push(weaponSelect.value);
    }
  }

  // Calculate cost
  const cost = ShipCosts.calculateSingleTurretCost(turretType, weapons);
  const costMCr = (cost / 1000000).toFixed(2);

  // Update display
  const costDisplay = document.getElementById(`turret-cost-${turretId}`);
  if (costDisplay) {
    costDisplay.textContent = `MCr ${costMCr}`;
  }
}

function applyTurretChanges(turretId) {
  const template = shipTemplates[currentTemplate];

  // Get values from form
  const turretTypeSelect = document.getElementById(`turret-type-${turretId}`);
  const turretType = turretTypeSelect.value;

  // Collect weapons
  const capacity = ShipCustomization.getTurretCapacity(turretType);
  const weapons = [];
  for (let i = 0; i < capacity; i++) {
    const weaponSelect = document.getElementById(`weapon-${turretId}-${i}`);
    if (weaponSelect && weaponSelect.value) {
      weapons.push(weaponSelect.value);
    }
  }

  // Initialize turrets array if needed
  if (!currentModifications.turrets) {
    currentModifications.turrets = [];
  }

  // Find or create turret entry
  let turretEntry = currentModifications.turrets.find(t => t.id === turretId);
  if (!turretEntry) {
    turretEntry = { id: turretId };
    currentModifications.turrets.push(turretEntry);
  }

  // Update turret configuration
  turretEntry.type = turretType;
  turretEntry.weapons = weapons;

  // Validate modifications
  const validation = ShipCustomization.validateCustomShip(template, currentModifications);

  // Display validation results
  if (!validation.valid) {
    alert('Validation errors:\n' + validation.errors.join('\n'));
    return;
  }

  if (validation.warnings.length > 0) {
    console.log('[CUSTOMIZER] Warnings:', validation.warnings);
  }

  // Update cost display
  updateCostDisplay(template, currentModifications);

  // Re-render SVG with updated labels
  renderShipSVG(template);

  // Show success feedback
  console.log('[CUSTOMIZER] Turret changes applied:', turretId, turretEntry);

  // Keep panel open to allow further edits
}

function generateCargoPanel(template) {
  const currentCargo = currentModifications.cargo !== undefined ? currentModifications.cargo : template.cargo;
  const currentFuel = currentModifications.fuel !== undefined ? currentModifications.fuel : template.fuel;
  const flexibleTonnage = template.cargo + template.fuel;

  return `
    <div class="panel-header">
      <div class="panel-title">📦 Cargo Bay</div>
      <button class="panel-close" onclick="clearComponentPanel()">×</button>
    </div>
    <div class="panel-body">
      <div class="form-group">
        <label for="cargo-slider">Cargo: <span id="cargo-value">${currentCargo}</span> tons</label>
        <input type="range" id="cargo-slider" min="0" max="${flexibleTonnage}" value="${currentCargo}" step="1"
               oninput="updateCargoFuelDisplay()" onchange="updateCargoFuelDisplay()">
      </div>

      <div class="form-group">
        <label for="fuel-slider">Fuel: <span id="fuel-value">${currentFuel}</span> tons</label>
        <input type="range" id="fuel-slider" min="0" max="${flexibleTonnage}" value="${currentFuel}" step="1"
               oninput="updateCargoFuelDisplay()" onchange="updateCargoFuelDisplay()">
      </div>

      <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 0.85em; color: #aaa;">
        <p style="margin: 5px 0;"><strong>Flexible Space:</strong> ${flexibleTonnage} tons total</p>
        <p style="margin: 5px 0;"><strong>Current Allocation:</strong></p>
        <p style="margin: 5px 0 5px 15px;">Cargo: ${currentCargo}t | Fuel: ${currentFuel}t</p>
        <p style="margin: 5px 0;" id="cargo-fuel-balance">
          <strong>Balance:</strong> <span id="balance-value">${currentCargo + currentFuel - flexibleTonnage}</span> tons
          <span id="balance-status" style="color: ${currentCargo + currentFuel === flexibleTonnage ? '#4caf50' : '#f44336'};">
            ${currentCargo + currentFuel === flexibleTonnage ? '✓' : '⚠ Must equal ' + flexibleTonnage}
          </span>
        </p>
      </div>

      <div style="margin: 15px 0; padding: 10px; background: rgba(100,150,255,0.1); border-left: 3px solid #6496ff; border-radius: 4px; font-size: 0.85em; color: #aaa;">
        <p style="margin: 0;"><strong>Note:</strong> Cargo/fuel trade-offs don't affect cost - you're just reallocating existing space.</p>
      </div>

      <button class="action-button primary" onclick="applyCargoFuelChanges()" style="margin-top: 15px; width: 100%;">
        Apply Changes
      </button>
    </div>
  `;
}

function generateFuelPanel(template) {
  // Fuel panel is identical to cargo panel since they're interdependent
  return generateCargoPanel(template);
}

function updateCargoFuelDisplay() {
  const template = shipTemplates[currentTemplate];
  const flexibleTonnage = template.cargo + template.fuel;

  const cargoSlider = document.getElementById('cargo-slider');
  const fuelSlider = document.getElementById('fuel-slider');
  const cargoDisplay = document.getElementById('cargo-value');
  const fuelDisplay = document.getElementById('fuel-value');
  const balanceValue = document.getElementById('balance-value');
  const balanceStatus = document.getElementById('balance-status');

  if (cargoSlider && fuelSlider && cargoDisplay && fuelDisplay) {
    const cargo = parseInt(cargoSlider.value);
    const fuel = parseInt(fuelSlider.value);
    const total = cargo + fuel;
    const balance = total - flexibleTonnage;

    cargoDisplay.textContent = cargo;
    fuelDisplay.textContent = fuel;
    balanceValue.textContent = balance;

    const isValid = total === flexibleTonnage;
    balanceStatus.style.color = isValid ? '#4caf50' : '#f44336';
    balanceStatus.textContent = isValid ? '✓' : '⚠ Must equal ' + flexibleTonnage;
  }
}

function applyCargoFuelChanges() {
  const template = shipTemplates[currentTemplate];
  const flexibleTonnage = template.cargo + template.fuel;

  const cargoSlider = document.getElementById('cargo-slider');
  const fuelSlider = document.getElementById('fuel-slider');
  const newCargo = parseInt(cargoSlider.value);
  const newFuel = parseInt(fuelSlider.value);

  // Validate total equals flexible tonnage
  if (newCargo + newFuel !== flexibleTonnage) {
    alert(`Cargo (${newCargo}t) + Fuel (${newFuel}t) must equal ${flexibleTonnage}t`);
    return;
  }

  // Update modifications
  currentModifications.cargo = newCargo;
  currentModifications.fuel = newFuel;

  // Validate
  const validation = ShipCustomization.validateCustomShip(template, currentModifications);

  if (!validation.valid) {
    alert('Validation errors:\n' + validation.errors.join('\n'));
    return;
  }

  if (validation.warnings.length > 0) {
    console.log('[CUSTOMIZER] Warnings:', validation.warnings);
  }

  // Update cost display (no cost change for cargo/fuel)
  updateCostDisplay(template, currentModifications);

  // Re-render SVG
  renderShipSVG(template);

  console.log('[CUSTOMIZER] Cargo/Fuel changes applied:', { cargo: newCargo, fuel: newFuel });
}

function generateMDrivePanel(template) {
  const currentThrust = currentModifications.thrust !== undefined ? currentModifications.thrust : template.thrust;
  const baseCost = ShipCosts.calculateMDriveCost(template, template.thrust);
  const newCost = ShipCosts.calculateMDriveCost(template, currentThrust);
  const costDiff = newCost - baseCost;
  const costDiffMCr = (costDiff / 1000000).toFixed(2);

  return `
    <div class="panel-header">
      <div class="panel-title">🚀 Maneuver Drive</div>
      <button class="panel-close" onclick="clearComponentPanel()">×</button>
    </div>
    <div class="panel-body">
      <div class="form-group">
        <label for="thrust-slider">Thrust Rating: <span id="thrust-value">${currentThrust}</span></label>
        <input type="range" id="thrust-slider" min="1" max="6" value="${currentThrust}" step="1"
               oninput="updateThrustDisplay()" onchange="updateMDriveCost()">
        <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #888; margin-top: 5px;">
          <span>1 (Slow)</span>
          <span>6 (Fast)</span>
        </div>
      </div>

      <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 0.85em; color: #aaa;">
        <p style="margin: 5px 0;"><strong>Base Thrust:</strong> ${template.thrust}</p>
        <p style="margin: 5px 0;"><strong>New Thrust:</strong> ${currentThrust}</p>
        <p style="margin: 5px 0;"><strong>Performance:</strong> ${currentThrust}G acceleration</p>
      </div>

      <div class="component-cost" style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 4px;">
        <span class="component-cost-label">Cost Change:</span>
        <span class="component-cost-value" id="mdrive-cost">${costDiff >= 0 ? '+' : ''}MCr ${costDiffMCr}</span>
      </div>

      <button class="action-button primary" onclick="applyMDriveChanges()" style="margin-top: 15px; width: 100%;">
        Apply Changes
      </button>
    </div>
  `;
}

function updateThrustDisplay() {
  const slider = document.getElementById('thrust-slider');
  const display = document.getElementById('thrust-value');
  if (slider && display) {
    display.textContent = slider.value;
  }
}

function updateMDriveCost() {
  const template = shipTemplates[currentTemplate];
  const slider = document.getElementById('thrust-slider');
  const newThrust = parseInt(slider.value);

  const baseCost = ShipCosts.calculateMDriveCost(template, template.thrust);
  const newCost = ShipCosts.calculateMDriveCost(template, newThrust);
  const costDiff = newCost - baseCost;
  const costDiffMCr = (costDiff / 1000000).toFixed(2);

  const costDisplay = document.getElementById('mdrive-cost');
  if (costDisplay) {
    costDisplay.textContent = `${costDiff >= 0 ? '+' : ''}MCr ${costDiffMCr}`;
  }
}

function applyMDriveChanges() {
  const template = shipTemplates[currentTemplate];
  const slider = document.getElementById('thrust-slider');
  const newThrust = parseInt(slider.value);

  // Update modifications
  currentModifications.thrust = newThrust;

  // Validate
  const validation = ShipCustomization.validateCustomShip(template, currentModifications);

  if (!validation.valid) {
    alert('Validation errors:\n' + validation.errors.join('\n'));
    return;
  }

  if (validation.warnings.length > 0) {
    console.log('[CUSTOMIZER] Warnings:', validation.warnings);
  }

  // Update cost display
  updateCostDisplay(template, currentModifications);

  // Re-render SVG
  renderShipSVG(template);

  console.log('[CUSTOMIZER] M-Drive changes applied:', newThrust);
}

function generateJDrivePanel(template) {
  const currentJump = currentModifications.jump !== undefined ? currentModifications.jump : template.jump;
  const baseCost = ShipCosts.calculateJDriveCost(template, template.jump);
  const newCost = ShipCosts.calculateJDriveCost(template, currentJump);
  const costDiff = newCost - baseCost;
  const costDiffMCr = (costDiff / 1000000).toFixed(2);

  return `
    <div class="panel-header">
      <div class="panel-title">⭐ Jump Drive</div>
      <button class="panel-close" onclick="clearComponentPanel()">×</button>
    </div>
    <div class="panel-body">
      <div class="form-group">
        <label for="jump-slider">Jump Rating: <span id="jump-value">${currentJump}</span></label>
        <input type="range" id="jump-slider" min="0" max="6" value="${currentJump}" step="1"
               oninput="updateJumpDisplay()" onchange="updateJDriveCost()">
        <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #888; margin-top: 5px;">
          <span>0 (In-system)</span>
          <span>6 (Long range)</span>
        </div>
      </div>

      <div style="margin: 15px 0; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 4px; font-size: 0.85em; color: #aaa;">
        <p style="margin: 5px 0;"><strong>Base Jump:</strong> ${template.jump}</p>
        <p style="margin: 5px 0;"><strong>New Jump:</strong> ${currentJump}</p>
        <p style="margin: 5px 0;"><strong>Range:</strong> ${currentJump === 0 ? 'In-system only' : currentJump + ' parsecs'}</p>
      </div>

      <div class="component-cost" style="margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 4px;">
        <span class="component-cost-label">Cost Change:</span>
        <span class="component-cost-value" id="jdrive-cost">${costDiff >= 0 ? '+' : ''}MCr ${costDiffMCr}</span>
      </div>

      <button class="action-button primary" onclick="applyJDriveChanges()" style="margin-top: 15px; width: 100%;">
        Apply Changes
      </button>
    </div>
  `;
}

function updateJumpDisplay() {
  const slider = document.getElementById('jump-slider');
  const display = document.getElementById('jump-value');
  if (slider && display) {
    display.textContent = slider.value;
  }
}

function updateJDriveCost() {
  const template = shipTemplates[currentTemplate];
  const slider = document.getElementById('jump-slider');
  const newJump = parseInt(slider.value);

  const baseCost = ShipCosts.calculateJDriveCost(template, template.jump);
  const newCost = ShipCosts.calculateJDriveCost(template, newJump);
  const costDiff = newCost - baseCost;
  const costDiffMCr = (costDiff / 1000000).toFixed(2);

  const costDisplay = document.getElementById('jdrive-cost');
  if (costDisplay) {
    costDisplay.textContent = `${costDiff >= 0 ? '+' : ''}MCr ${costDiffMCr}`;
  }
}

function applyJDriveChanges() {
  const template = shipTemplates[currentTemplate];
  const slider = document.getElementById('jump-slider');
  const newJump = parseInt(slider.value);

  // Update modifications
  currentModifications.jump = newJump;

  // Validate
  const validation = ShipCustomization.validateCustomShip(template, currentModifications);

  if (!validation.valid) {
    alert('Validation errors:\n' + validation.errors.join('\n'));
    return;
  }

  if (validation.warnings.length > 0) {
    console.log('[CUSTOMIZER] Warnings:', validation.warnings);
  }

  // Update cost display
  updateCostDisplay(template, currentModifications);

  // Re-render SVG
  renderShipSVG(template);

  console.log('[CUSTOMIZER] J-Drive changes applied:', newJump);
}

function clearComponentPanel() {
  const panel = document.getElementById('component-panel-content');
  panel.innerHTML = `
    <div class="panel-placeholder">
      <p style="text-align: center; color: #888; margin: 20px;">
        Click a component on the ship schematic to customize it
      </p>
    </div>
  `;
  panel.classList.remove('component-panel-active');

  // Clear selection
  document.querySelectorAll('.clickable-component').forEach(el => {
    el.classList.remove('selected');
  });
  selectedComponent = null;
}

// ======== TAB SWITCHING ========

function switchTab(tabName) {
  // Update tab button states
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Show/hide tab content
  const templatesTab = document.getElementById('templates-tab');
  const myShipsTab = document.getElementById('my-ships-tab');

  if (tabName === 'templates') {
    templatesTab.classList.remove('hidden');
    myShipsTab.classList.add('hidden');
  } else if (tabName === 'my-ships') {
    templatesTab.classList.add('hidden');
    myShipsTab.classList.remove('hidden');
    // Render ship library when switching to My Ships tab
    renderShipLibrary();
  }

  console.log('[CUSTOMIZER] Switched to tab:', tabName);
}

// ======== SHIP LIBRARY RENDERING ========

function renderShipLibrary() {
  const container = document.getElementById('ship-library-container');

  // Get all custom ships from localStorage
  const ships = window.ShipLibrary ? window.ShipLibrary.getAllShips() : [];

  if (ships.length === 0) {
    // Show empty state
    container.innerHTML = `
      <div class="ship-library-empty">
        <div class="ship-library-empty-icon">🚀</div>
        <div class="ship-library-empty-text">
          No custom ships yet.<br>
          Design a ship and save it to see it here!
        </div>
      </div>
    `;
    return;
  }

  // Render ship cards
  container.innerHTML = ships.map(ship => {
    const template = shipTemplates[ship.templateId];
    const templateName = template ? template.name : ship.templateId;
    const costMCr = (ship.totalCost / 1000000).toFixed(2);

    return `
      <div class="ship-card" data-ship-id="${ship.id}">
        <div class="ship-card-header">
          <div class="ship-card-name">${ship.name}</div>
        </div>
        <div class="ship-card-template">${templateName}</div>
        <div class="ship-card-cost">MCr ${costMCr}</div>
        <div class="ship-card-actions">
          <button class="load" data-ship-id="${ship.id}">Load</button>
          <button class="delete" data-ship-id="${ship.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners to Load and Delete buttons
  container.querySelectorAll('button.load').forEach(btn => {
    btn.addEventListener('click', () => {
      const shipId = btn.getAttribute('data-ship-id');
      loadCustomShip(shipId);
    });
  });

  container.querySelectorAll('button.delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const shipId = btn.getAttribute('data-ship-id');
      deleteCustomShip(shipId);
    });
  });

  console.log('[CUSTOMIZER] Rendered ship library:', ships.length, 'ships');
}

function loadCustomShip(shipId) {
  const ship = window.ShipLibrary ? window.ShipLibrary.getShip(shipId) : null;
  if (!ship) {
    alert('❌ Ship not found in library');
    return;
  }

  // Check if there are unsaved changes
  const hasUnsavedChanges = Object.keys(currentModifications).length > 0;

  if (hasUnsavedChanges) {
    // Show user choice dialog
    const choice = confirm(
      `⚠️ You have unsaved changes to the current ship.\n\n` +
      `Click OK to DISCARD changes and load "${ship.name}"\n` +
      `Click Cancel to go back and save your current work`
    );

    if (!choice) {
      // User chose Cancel - return without loading
      return;
    }
  }

  // Load the ship
  const template = shipTemplates[ship.templateId];
  if (!template) {
    alert(`❌ Template "${ship.templateId}" not found`);
    return;
  }

  // Set current state
  currentTemplate = ship.templateId;
  currentModifications = JSON.parse(JSON.stringify(ship.mods)); // Deep copy
  selectedComponent = null;

  // Update UI
  updateSchematicTitle(template);
  renderShipSVG(template);
  updateCostDisplay(template);
  clearComponentPanel();

  // Pre-fill ship name
  document.getElementById('ship-name').value = ship.name;

  // Switch back to Templates tab to show the loaded ship
  switchTab('templates');

  // Update template selection highlighting
  const templateOptions = document.querySelectorAll('.template-option');
  templateOptions.forEach(opt => {
    if (opt.getAttribute('data-template') === ship.templateId) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  console.log('[CUSTOMIZER] Loaded custom ship:', ship.name, ship.id);
  alert(`✅ Loaded ship: ${ship.name}`);
}

function deleteCustomShip(shipId) {
  const ship = window.ShipLibrary ? window.ShipLibrary.getShip(shipId) : null;
  if (!ship) {
    alert('❌ Ship not found in library');
    return;
  }

  // Confirmation dialog
  const confirmed = confirm(
    `⚠️ Delete "${ship.name}"?\n\n` +
    `This action cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  // Delete the ship
  const success = window.ShipLibrary.deleteShip(shipId);

  if (success) {
    console.log('[CUSTOMIZER] Deleted ship:', ship.name, shipId);
    alert(`✅ Deleted ship: ${ship.name}`);
    // Re-render the library to reflect the deletion
    renderShipLibrary();
  } else {
    alert('❌ Failed to delete ship');
  }
}

// ======== EVENT LISTENERS ========

function setupEventListeners() {
  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Template selection
  const templateOptions = document.querySelectorAll('.template-option');
  templateOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Update active state
      templateOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');

      // Load template
      const templateId = option.getAttribute('data-template');
      loadShipTemplate(templateId);
    });
  });

  // Back to menu button
  document.getElementById('back-to-menu').addEventListener('click', () => {
    window.location.href = '/';
  });

  // Save ship button
  document.getElementById('save-ship-button').addEventListener('click', () => {
    const shipName = document.getElementById('ship-name').value.trim();
    if (!shipName) {
      alert('Please enter a ship name');
      return;
    }

    // Get current template and modifications
    const template = shipTemplates[currentTemplate];
    if (!template) {
      alert('No ship template selected');
      return;
    }

    // Check if we have any modifications
    if (Object.keys(currentModifications).length === 0) {
      const confirmSave = confirm('You haven\'t made any modifications. Save the default configuration anyway?');
      if (!confirmSave) {
        return;
      }
    }

    // Save to library
    try {
      const savedShip = ShipLibrary.saveShip(template, currentModifications, shipName);

      // Clear ship name input
      document.getElementById('ship-name').value = '';

      // Show success message
      alert(`✅ Ship "${savedShip.name}" saved successfully!\n\nTotal Cost: MCr ${(savedShip.totalCost / 1000000).toFixed(2)}\n\nYou can view and manage your ships in the Ship Library.`);

      console.log('[CUSTOMIZER] Ship saved:', savedShip);

      // Auto-switch to My Ships tab and refresh library
      switchTab('my-ships');
    } catch (error) {
      console.error('[CUSTOMIZER] Error saving ship:', error);
      alert('❌ Error saving ship. Please try again.');
    }
  });
}
