/**
 * Input Validators for Operations VTT
 * AR-16.5: Security hardening through input validation
 *
 * Validates all user input before processing to prevent
 * injection attacks and malformed data.
 */

// UUID v4 regex pattern
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Safe string pattern (alphanumeric, spaces, basic punctuation)
const SAFE_STRING_REGEX = /^[\w\s\-.,!?'"():;@#&*+=/\\[\]{}|~`^%$]*$/;

// Dangerous characters to strip
const DANGEROUS_CHARS_REGEX = /[<>]/g;

/**
 * Validate UUID v4 format
 * @param {string} id - ID to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {{valid: boolean, error?: string}}
 */
function validateUUID(id, fieldName = 'id') {
  if (!id) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (typeof id !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  if (!UUID_V4_REGEX.test(id)) {
    return { valid: false, error: `${fieldName} must be a valid UUID v4` };
  }

  return { valid: true };
}

/**
 * Validate string input
 * @param {string} str - String to validate
 * @param {Object} options - Validation options
 * @param {string} options.fieldName - Name of field for error messages
 * @param {number} options.minLength - Minimum length (default: 0)
 * @param {number} options.maxLength - Maximum length (default: 1000)
 * @param {boolean} options.required - Whether field is required (default: false)
 * @param {boolean} options.allowEmpty - Allow empty string (default: true if not required)
 * @returns {{valid: boolean, error?: string, sanitized?: string}}
 */
function validateString(str, options = {}) {
  const {
    fieldName = 'field',
    minLength = 0,
    maxLength = 1000,
    required = false,
    allowEmpty = !required
  } = options;

  // Handle null/undefined
  if (str === null || str === undefined) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, sanitized: '' };
  }

  // Type check
  if (typeof str !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  // Trim whitespace
  const trimmed = str.trim();

  // Empty check
  if (trimmed === '' && !allowEmpty) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  // Length checks
  if (trimmed.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `${fieldName} cannot exceed ${maxLength} characters` };
  }

  // Sanitize dangerous characters
  const sanitized = trimmed.replace(DANGEROUS_CHARS_REGEX, '');

  return { valid: true, sanitized };
}

/**
 * Validate integer input
 * @param {any} num - Number to validate
 * @param {Object} options - Validation options
 * @param {string} options.fieldName - Name of field for error messages
 * @param {number} options.min - Minimum value (default: -Infinity)
 * @param {number} options.max - Maximum value (default: Infinity)
 * @param {boolean} options.required - Whether field is required (default: false)
 * @returns {{valid: boolean, error?: string, value?: number}}
 */
function validateInteger(num, options = {}) {
  const {
    fieldName = 'field',
    min = -Infinity,
    max = Infinity,
    required = false
  } = options;

  // Handle null/undefined
  if (num === null || num === undefined) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: null };
  }

  // Parse if string
  const parsed = typeof num === 'string' ? parseInt(num, 10) : num;

  // Type/NaN check
  if (typeof parsed !== 'number' || isNaN(parsed)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }

  // Integer check
  if (!Number.isInteger(parsed)) {
    return { valid: false, error: `${fieldName} must be an integer` };
  }

  // Range checks
  if (parsed < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (parsed > max) {
    return { valid: false, error: `${fieldName} cannot exceed ${max}` };
  }

  return { valid: true, value: parsed };
}

/**
 * Validate boolean input
 * @param {any} bool - Boolean to validate
 * @param {Object} options - Validation options
 * @param {string} options.fieldName - Name of field for error messages
 * @param {boolean} options.required - Whether field is required (default: false)
 * @returns {{valid: boolean, error?: string, value?: boolean}}
 */
function validateBoolean(bool, options = {}) {
  const { fieldName = 'field', required = false } = options;

  // Handle null/undefined
  if (bool === null || bool === undefined) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: null };
  }

  // Type check
  if (typeof bool !== 'boolean') {
    // Try to coerce string booleans
    if (bool === 'true') return { valid: true, value: true };
    if (bool === 'false') return { valid: true, value: false };
    return { valid: false, error: `${fieldName} must be a boolean` };
  }

  return { valid: true, value: bool };
}

/**
 * Validate enum value
 * @param {any} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {Object} options - Validation options
 * @param {string} options.fieldName - Name of field for error messages
 * @param {boolean} options.required - Whether field is required (default: false)
 * @returns {{valid: boolean, error?: string, value?: any}}
 */
function validateEnum(value, allowedValues, options = {}) {
  const { fieldName = 'field', required = false } = options;

  // Handle null/undefined
  if (value === null || value === undefined) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, value: null };
  }

  // Check if value is allowed
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`
    };
  }

  return { valid: true, value };
}

/**
 * Validate multiple fields at once
 * @param {Object} data - Data object to validate
 * @param {Object} schema - Validation schema
 * @returns {{valid: boolean, errors: Object, sanitized: Object}}
 */
function validateObject(data, schema) {
  const errors = {};
  const sanitized = {};
  let valid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    let result;

    switch (rules.type) {
      case 'uuid':
        result = validateUUID(value, field);
        if (result.valid) sanitized[field] = value;
        break;

      case 'string':
        result = validateString(value, { fieldName: field, ...rules });
        if (result.valid) sanitized[field] = result.sanitized;
        break;

      case 'integer':
        result = validateInteger(value, { fieldName: field, ...rules });
        if (result.valid) sanitized[field] = result.value;
        break;

      case 'boolean':
        result = validateBoolean(value, { fieldName: field, ...rules });
        if (result.valid) sanitized[field] = result.value;
        break;

      case 'enum':
        result = validateEnum(value, rules.values, { fieldName: field, ...rules });
        if (result.valid) sanitized[field] = result.value;
        break;

      default:
        // Pass through unknown types
        sanitized[field] = value;
        result = { valid: true };
    }

    if (!result.valid) {
      valid = false;
      errors[field] = result.error;
    }
  }

  return { valid, errors, sanitized };
}

/**
 * Quick validation helpers for common patterns
 */
const validators = {
  // Validate campaign ID
  campaignId: (id) => validateUUID(id, 'campaignId'),

  // Validate account ID
  accountId: (id) => validateUUID(id, 'accountId'),

  // Validate ship ID
  shipId: (id) => validateUUID(id, 'shipId'),

  // Validate contact ID
  contactId: (id) => validateUUID(id, 'contactId'),

  // Validate campaign name
  campaignName: (name) => validateString(name, {
    fieldName: 'name',
    minLength: 1,
    maxLength: 100,
    required: true
  }),

  // Validate player/slot name
  playerName: (name) => validateString(name, {
    fieldName: 'name',
    minLength: 1,
    maxLength: 50,
    required: true
  }),

  // Validate description
  description: (desc) => validateString(desc, {
    fieldName: 'description',
    maxLength: 2000
  }),

  // Validate role (matches ROLE_VIEWS in operations/index.js)
  role: (role) => validateEnum(role, [
    'captain', 'pilot', 'astrogator', 'engineer', 'gunner',
    'sensor_operator', 'damage_control', 'medic', 'marines',
    'steward', 'cargo_master', 'observer', 'gm'
  ], { fieldName: 'role', required: true }),

  // Validate alert status
  alertStatus: (status) => validateEnum(status, [
    'GREEN', 'YELLOW', 'RED', 'BATTLE_STATIONS'
  ], { fieldName: 'alertStatus', required: true }),

  // Validate disposition
  disposition: (disp) => validateEnum(disp, [
    'friendly', 'neutral', 'hostile', 'unknown'
  ], { fieldName: 'disposition' })
};

module.exports = {
  validateUUID,
  validateString,
  validateInteger,
  validateBoolean,
  validateEnum,
  validateObject,
  validators,
  // Constants for testing
  UUID_V4_REGEX,
  SAFE_STRING_REGEX,
  DANGEROUS_CHARS_REGEX
};
