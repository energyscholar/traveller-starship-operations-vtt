#!/usr/bin/env node
// JSON Data Validator - Validates ship and weapon JSON files against schemas
// Run with: node tools/validate-json.js [--fix]
//
// Features:
// - Validates all JSON files in data/ directory
// - Checks against JSON schemas
// - Reports errors with file:line information
// - Interactive remediation with --fix flag

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class JSONValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.filesChecked = 0;
    this.dataPath = path.join(__dirname, '../data');
    this.interactive = process.argv.includes('--fix');
  }

  // ============================================================
  // VALIDATION LOGIC
  // ============================================================

  validateShipFile(filePath, data) {
    const errors = [];
    const filename = path.basename(filePath);

    // Required fields
    const required = ['id', 'type', 'name', 'tonnage', 'role', 'hull', 'armour', 'thrust', 'turrets'];
    for (const field of required) {
      if (data[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Type validation
    if (data.id && typeof data.id !== 'string') {
      errors.push(`Field 'id' must be a string, got ${typeof data.id}`);
    }

    if (data.id && !/^[a-z_]+$/.test(data.id)) {
      errors.push(`Field 'id' must be snake_case (lowercase + underscores): ${data.id}`);
    }

    if (data.tonnage && typeof data.tonnage !== 'number') {
      errors.push(`Field 'tonnage' must be a number, got ${typeof data.tonnage}`);
    }

    if (data.tonnage && (data.tonnage < 10 || data.tonnage > 1000000)) {
      errors.push(`Field 'tonnage' must be between 10 and 1,000,000, got ${data.tonnage}`);
    }

    // Role validation
    const validRoles = ['exploration', 'trading', 'military', 'piracy', 'patrol', 'transport', 'mining'];
    if (data.role && !validRoles.includes(data.role)) {
      errors.push(`Field 'role' must be one of: ${validRoles.join(', ')}, got '${data.role}'`);
    }

    // Turrets validation
    if (data.turrets) {
      if (!Array.isArray(data.turrets)) {
        errors.push(`Field 'turrets' must be an array`);
      } else {
        data.turrets.forEach((turret, idx) => {
          if (!turret.id) {
            errors.push(`Turret ${idx} missing 'id' field`);
          }
          if (!turret.type) {
            errors.push(`Turret ${idx} missing 'type' field`);
          }
          if (!turret.weapons || !Array.isArray(turret.weapons)) {
            errors.push(`Turret ${idx} missing 'weapons' array`);
          }

          const validTypes = ['single', 'double', 'triple', 'barbette', 'bay'];
          if (turret.type && !validTypes.includes(turret.type)) {
            errors.push(`Turret ${idx} type must be one of: ${validTypes.join(', ')}`);
          }

          if (turret.weapons && turret.weapons.length > 3) {
            errors.push(`Turret ${idx} has ${turret.weapons.length} weapons (max 3)`);
          }
        });
      }
    }

    // Crew requirements validation
    if (data.crewRequirements) {
      const validRoles = ['pilot', 'gunner', 'engineer', 'sensors', 'marines'];
      for (const role in data.crewRequirements) {
        if (!validRoles.includes(role)) {
          this.warnings.push(`${filename}: Unknown crew role '${role}'`);
        }
        if (typeof data.crewRequirements[role] !== 'number') {
          errors.push(`Crew requirement '${role}' must be a number`);
        }
      }
    }

    return errors;
  }

  validateWeaponFile(filePath, data) {
    const errors = [];

    if (!data.weapons || !Array.isArray(data.weapons)) {
      errors.push(`File must contain 'weapons' array`);
      return errors;
    }

    data.weapons.forEach((weapon, idx) => {
      const required = ['id', 'name', 'type', 'damage', 'traits'];
      for (const field of required) {
        if (weapon[field] === undefined) {
          errors.push(`Weapon ${idx} (${weapon.name || 'unknown'}) missing field: ${field}`);
        }
      }

      if (weapon.id && !/^[a-z_]+$/.test(weapon.id)) {
        errors.push(`Weapon ${idx} id must be snake_case: ${weapon.id}`);
      }

      const validTypes = ['energy', 'projectile', 'missile', 'defense'];
      if (weapon.type && !validTypes.includes(weapon.type)) {
        errors.push(`Weapon ${idx} type must be one of: ${validTypes.join(', ')}`);
      }

      if (weapon.damage && !/^[0-9]d6$/.test(weapon.damage)) {
        errors.push(`Weapon ${idx} damage must match pattern XdY (e.g., '2d6'): ${weapon.damage}`);
      }

      // Warn if defensive weapon has non-zero damage
      if (weapon.type === 'defense' && weapon.damage && weapon.damage !== '0d6') {
        this.warnings.push(`Weapon ${idx} (${weapon.name}) is type 'defense' but has damage ${weapon.damage} (expected '0d6')`);
      }

      if (weapon.traits) {
        if (weapon.traits.ammo !== null && typeof weapon.traits.ammo !== 'number') {
          errors.push(`Weapon ${idx} traits.ammo must be number or null`);
        }
      }
    });

    return errors;
  }

  validateIndexFile(filePath, data) {
    const errors = [];

    if (!data.ships || !Array.isArray(data.ships)) {
      errors.push(`Index must contain 'ships' array`);
      return errors;
    }

    const seenIds = new Set();
    data.ships.forEach((ship, idx) => {
      if (!ship.id) {
        errors.push(`Ship ${idx} missing 'id' field`);
      } else if (seenIds.has(ship.id)) {
        errors.push(`Duplicate ship id: ${ship.id}`);
      } else {
        seenIds.add(ship.id);
      }

      if (!ship.file) {
        errors.push(`Ship ${idx} (${ship.id}) missing 'file' field`);
      } else {
        // Check if file exists
        const shipFilePath = path.join(path.dirname(filePath), ship.file);
        if (!fs.existsSync(shipFilePath)) {
          errors.push(`Ship ${idx} (${ship.id}) references non-existent file: ${ship.file}`);
        }
      }

      const required = ['id', 'name', 'tonnage', 'role', 'file'];
      for (const field of required) {
        if (ship[field] === undefined) {
          errors.push(`Ship ${idx} missing field: ${field}`);
        }
      }
    });

    return errors;
  }

  validateJSONSyntax(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      return { valid: true, data };
    } catch (error) {
      return {
        valid: false,
        error: `JSON syntax error: ${error.message}`
      };
    }
  }

  validateFile(filePath) {
    this.filesChecked++;
    const relativePath = path.relative(this.dataPath, filePath);

    // Check JSON syntax first
    const syntaxCheck = this.validateJSONSyntax(filePath);
    if (!syntaxCheck.valid) {
      this.errors.push({
        file: relativePath,
        errors: [syntaxCheck.error]
      });
      return;
    }

    const data = syntaxCheck.data;
    let validationErrors = [];

    // Determine file type and validate
    if (filePath.includes('ships/index.json')) {
      validationErrors = this.validateIndexFile(filePath, data);
    } else if (filePath.includes('ships/') && filePath.endsWith('.json')) {
      validationErrors = this.validateShipFile(filePath, data);
    } else if (filePath.includes('weapons/weapons.json')) {
      validationErrors = this.validateWeaponFile(filePath, data);
    }

    if (validationErrors.length > 0) {
      this.errors.push({
        file: relativePath,
        errors: validationErrors
      });
    }
  }

  scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && file !== 'schemas') {
        this.scanDirectory(fullPath);
      } else if (file.endsWith('.json') && file !== 'package.json') {
        this.validateFile(fullPath);
      }
    }
  }

  // ============================================================
  // INTERACTIVE REMEDIATION
  // ============================================================

  async promptUser(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });
  }

  async handleError(fileError) {
    console.log(`\n${COLORS.yellow}File: ${fileError.file}${COLORS.reset}`);
    console.log(`${COLORS.red}Errors found:${COLORS.reset}`);
    fileError.errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err}`);
    });

    if (!this.interactive) {
      return;
    }

    console.log(`\n${COLORS.cyan}Actions:${COLORS.reset}`);
    console.log(`  [v] View file`);
    console.log(`  [s] Skip`);
    console.log(`  [q] Quit`);

    const answer = await this.promptUser('Choose action: ');

    if (answer === 'v') {
      const fullPath = path.join(this.dataPath, fileError.file);
      const content = fs.readFileSync(fullPath, 'utf8');
      console.log(`\n${COLORS.blue}--- File Contents ---${COLORS.reset}`);
      console.log(content);
      console.log(`${COLORS.blue}--- End ---${COLORS.reset}\n`);

      // Ask again
      return this.handleError(fileError);
    } else if (answer === 'q') {
      process.exit(1);
    }
  }

  // ============================================================
  // REPORTING
  // ============================================================

  async run() {
    console.log(`${COLORS.cyan}========================================`);
    console.log(`JSON DATA VALIDATION`);
    console.log(`========================================${COLORS.reset}\n`);

    console.log(`Scanning: ${this.dataPath}`);
    console.log(`Interactive mode: ${this.interactive ? 'ON' : 'OFF'}\n`);

    this.scanDirectory(this.dataPath);

    console.log(`\n${COLORS.cyan}========================================`);
    console.log(`VALIDATION RESULTS`);
    console.log(`========================================${COLORS.reset}\n`);

    console.log(`Files checked: ${this.filesChecked}`);
    console.log(`Errors found: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}`);

    if (this.warnings.length > 0) {
      console.log(`\n${COLORS.yellow}WARNINGS:${COLORS.reset}`);
      this.warnings.forEach(warning => {
        console.log(`  ⚠️  ${warning}`);
      });
    }

    if (this.errors.length > 0) {
      console.log(`\n${COLORS.red}ERRORS:${COLORS.reset}`);

      for (const fileError of this.errors) {
        await this.handleError(fileError);
      }

      console.log(`\n${COLORS.red}❌ VALIDATION FAILED${COLORS.reset}`);
      console.log(`\nRun with --fix for interactive remediation:`);
      console.log(`  node tools/validate-json.js --fix`);

      process.exit(1);
    } else {
      console.log(`\n${COLORS.green}✅ ALL JSON FILES VALID${COLORS.reset}`);
    }
  }
}

// ============================================================
// MAIN
// ============================================================

if (require.main === module) {
  const validator = new JSONValidator();
  validator.run().catch(error => {
    console.error(`${COLORS.red}Fatal error: ${error.message}${COLORS.reset}`);
    process.exit(1);
  });
}

module.exports = { JSONValidator };
