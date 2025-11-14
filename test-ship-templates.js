#!/usr/bin/env node

/**
 * Ship Templates Implementation Validation Script
 * Checks files, syntax, paths, and defensive coding patterns
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Ship Templates Implementation...\n');
console.log('='.repeat(60));

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// CHECK 1: Files exist
console.log('\n📁 CHECK 1: Files exist');
console.log('-'.repeat(60));

const files = [
  'public/ship-templates.html',
  'public/ship-templates.css',
  'public/ship-templates.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
    checks.passed++;
  } else {
    console.log(`❌ ${file} - NOT FOUND`);
    checks.failed++;
  }
});

// CHECK 2: HTML has correct links (no subdirectories)
console.log('\n🔗 CHECK 2: HTML links (correct paths)');
console.log('-'.repeat(60));

if (fs.existsSync('public/ship-templates.html')) {
  const html = fs.readFileSync('public/ship-templates.html', 'utf8');

  // Should link to styles.css (NOT css/main.css)
  if (html.includes('href="styles.css"')) {
    console.log('✅ Links to styles.css (correct path)');
    checks.passed++;
  } else {
    console.log('❌ Missing link to styles.css');
    checks.failed++;
  }

  // Should link to ship-templates.css (NOT css/ship-templates.css)
  if (html.includes('href="ship-templates.css"')) {
    console.log('✅ Links to ship-templates.css (correct path)');
    checks.passed++;
  } else {
    console.log('❌ Missing link to ship-templates.css');
    checks.failed++;
  }

  // Should link to ship-templates.js (NOT js/ship-templates.js)
  if (html.includes('src="ship-templates.js"')) {
    console.log('✅ Links to ship-templates.js (correct path)');
    checks.passed++;
  } else {
    console.log('❌ Missing link to ship-templates.js');
    checks.failed++;
  }

  // Should NOT use type="module"
  if (html.includes('type="module"')) {
    console.log('⚠️  WARNING: Uses type="module" (should be plain script)');
    checks.warnings++;
  } else {
    console.log('✅ Uses plain script tag (correct)');
    checks.passed++;
  }

  // Should have loading and error states
  if (html.includes('loading-indicator') && html.includes('error-display')) {
    console.log('✅ Has loading and error state elements');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: Missing loading or error state elements');
    checks.warnings++;
  }
} else {
  console.log('⚠️  Skipping HTML checks (file not found)');
}

// CHECK 3: Template files exist
console.log('\n📦 CHECK 3: V2 Template files');
console.log('-'.repeat(60));

const templates = [
  'scout',
  'free_trader',
  'far_trader',
  'patrol_corvette',
  'mercenary_cruiser',
  'subsidised_liner',
  'safari_ship'
];

templates.forEach(id => {
  const file = `data/ships/v2/${id}.json`;
  if (fs.existsSync(file)) {
    // Verify JSON is valid
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.name && data.tonnage && data.drives && data.power) {
        console.log(`✅ ${id}.json (valid structure)`);
        checks.passed++;
      } else {
        console.log(`⚠️  ${id}.json (missing required fields)`);
        checks.warnings++;
      }
    } catch (err) {
      console.log(`❌ ${id}.json - INVALID JSON: ${err.message}`);
      checks.failed++;
    }
  } else {
    console.log(`❌ ${id}.json - NOT FOUND`);
    checks.failed++;
  }
});

// CHECK 4: JavaScript defensive coding
console.log('\n🛡️  CHECK 4: JavaScript defensive coding');
console.log('-'.repeat(60));

if (fs.existsSync('public/ship-templates.js')) {
  const js = fs.readFileSync('public/ship-templates.js', 'utf8');

  // Should use optional chaining
  if (js.includes('?.')) {
    console.log('✅ Uses optional chaining (?.)');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: No optional chaining detected');
    checks.warnings++;
  }

  // Should use nullish coalescing
  if (js.includes('??')) {
    console.log('✅ Uses nullish coalescing (??)');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: No nullish coalescing detected');
    checks.warnings++;
  }

  // Should have error handling
  if (js.includes('try') && js.includes('catch')) {
    console.log('✅ Has error handling (try/catch)');
    checks.passed++;
  } else {
    console.log('❌ Missing error handling (try/catch)');
    checks.failed++;
  }

  // Should have loadTemplates function
  if (js.includes('function loadTemplates') || js.includes('async function loadTemplates')) {
    console.log('✅ Has loadTemplates() function');
    checks.passed++;
  } else {
    console.log('❌ Missing loadTemplates() function');
    checks.failed++;
  }

  // Should have renderTable function
  if (js.includes('function renderTable')) {
    console.log('✅ Has renderTable() function');
    checks.passed++;
  } else {
    console.log('❌ Missing renderTable() function');
    checks.failed++;
  }

  // Should have renderTemplateDetails function
  if (js.includes('function renderTemplateDetails')) {
    console.log('✅ Has renderTemplateDetails() function');
    checks.passed++;
  } else {
    console.log('❌ Missing renderTemplateDetails() function');
    checks.failed++;
  }

  // Should have calculateTonnageUsed function
  if (js.includes('function calculateTonnageUsed')) {
    console.log('✅ Has calculateTonnageUsed() function');
    checks.passed++;
  } else {
    console.log('❌ Missing calculateTonnageUsed() function');
    checks.failed++;
  }

  // Check for complete tonnage calculation (includes systems, craft)
  if (js.includes('template.systems') && js.includes('template.craft')) {
    console.log('✅ calculateTonnageUsed includes systems and craft');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: calculateTonnageUsed might be incomplete');
    checks.warnings++;
  }

  // Should have DOMContentLoaded
  if (js.includes('DOMContentLoaded')) {
    console.log('✅ Has DOMContentLoaded initialization');
    checks.passed++;
  } else {
    console.log('❌ Missing DOMContentLoaded initialization');
    checks.failed++;
  }
} else {
  console.log('⚠️  Skipping JavaScript checks (file not found)');
}

// CHECK 5: CSS exists and has tactical colors
console.log('\n🎨 CHECK 5: CSS styling');
console.log('-'.repeat(60));

if (fs.existsSync('public/ship-templates.css')) {
  const css = fs.readFileSync('public/ship-templates.css', 'utf8');

  // Check for tactical color scheme
  if (css.includes('--color-valid') && css.includes('--color-warning') && css.includes('--color-error')) {
    console.log('✅ Has tactical color scheme');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: Missing tactical color variables');
    checks.warnings++;
  }

  // Check for table styling
  if (css.includes('#ships-table')) {
    console.log('✅ Has table styling');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: Missing table styling');
    checks.warnings++;
  }

  // Check for detail view styling
  if (css.includes('#ship-details')) {
    console.log('✅ Has detail view styling');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: Missing detail view styling');
    checks.warnings++;
  }

  // Check for loading/error states
  if (css.includes('.loading-state') && css.includes('.error-state')) {
    console.log('✅ Has loading and error state styling');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: Missing loading/error state styling');
    checks.warnings++;
  }
} else {
  console.log('⚠️  Skipping CSS checks (file not found)');
}

// CHECK 6: index.html has link to ship-templates
console.log('\n🔗 CHECK 6: Main menu link');
console.log('-'.repeat(60));

if (fs.existsSync('public/index.html')) {
  const index = fs.readFileSync('public/index.html', 'utf8');

  if (index.includes('ship-templates.html')) {
    console.log('✅ index.html has link to ship-templates.html');
    checks.passed++;
  } else {
    console.log('⚠️  WARNING: index.html missing link to ship-templates.html');
    checks.warnings++;
  }
} else {
  console.log('⚠️  index.html not found');
  checks.warnings++;
}

// SUMMARY
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION RESULTS');
console.log('='.repeat(60));
console.log(`✅ Passed:   ${checks.passed}`);
console.log(`❌ Failed:   ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);
console.log('='.repeat(60));

if (checks.failed === 0) {
  console.log('\n🎉 ✅ ALL CRITICAL CHECKS PASSED!');
  if (checks.warnings > 0) {
    console.log(`⚠️  ${checks.warnings} warning(s) - review recommended but not critical`);
  }
  console.log('\n📋 Next step: Run manual browser testing');
  console.log('   1. Start server: npm start');
  console.log('   2. Open: http://localhost:3000/ship-templates.html');
  console.log('   3. Verify: table loads, rows clickable, details expand\n');
  process.exit(0);
} else {
  console.log('\n❌ VALIDATION FAILED');
  console.log(`   ${checks.failed} critical error(s) must be fixed before deployment\n`);
  process.exit(1);
}
