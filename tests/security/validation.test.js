/**
 * AR-16.10: Security Test Suite - Input Validation
 * Tests that input validation is working correctly
 */

const {
  isValidUUID,
  isValidSimpleId,
  isValidId,
  isValidCampaignCode,
  isValidName,
  isValidRole,
  validateEventData
} = require('../../lib/operations/validators');

describe('Input Validation', () => {
  describe('UUID validation', () => {
    test('accepts valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-41d4-80b4-00c04fd430c8')).toBe(true);
    });

    test('rejects invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID(undefined)).toBe(false);
      expect(isValidUUID(123)).toBe(false);
      expect(isValidUUID('550e8400-e29b-51d4-a716-446655440000')).toBe(false); // Wrong version
    });
  });

  describe('Simple ID validation', () => {
    test('accepts valid simple IDs', () => {
      expect(isValidSimpleId('abc123')).toBe(true);
      expect(isValidSimpleId('test-id-123')).toBe(true);
      expect(isValidSimpleId('TEST_ID')).toBe(true);
    });

    test('rejects invalid simple IDs', () => {
      expect(isValidSimpleId('')).toBe(false);
      expect(isValidSimpleId('a'.repeat(65))).toBe(false); // Too long
      expect(isValidSimpleId('has spaces')).toBe(false);
      expect(isValidSimpleId('has@special')).toBe(false);
    });
  });

  describe('Name validation', () => {
    test('accepts valid names', () => {
      expect(isValidName('John Doe')).toBe(true);
      expect(isValidName('Campaign #1')).toBe(true);
      expect(isValidName('Test')).toBe(true);
    });

    test('rejects invalid names', () => {
      expect(isValidName('')).toBe(false);
      expect(isValidName('a'.repeat(101))).toBe(false); // Too long
      expect(isValidName('Has\x00null')).toBe(false); // Control char
      expect(isValidName('Has\nnewline')).toBe(false); // Newline
    });
  });

  describe('Role validation', () => {
    test('accepts valid roles', () => {
      expect(isValidRole('captain')).toBe(true);
      expect(isValidRole('pilot')).toBe(true);
      expect(isValidRole('gunner')).toBe(true);
    });

    test('rejects invalid roles', () => {
      expect(isValidRole('CAPTAIN')).toBe(false); // Must be lowercase
      expect(isValidRole('super-captain')).toBe(false); // No hyphens
      expect(isValidRole('')).toBe(false);
    });
  });

  describe('Event data validation', () => {
    test('validates required fields', () => {
      const schema = { name: 'name!', id: 'id!' };

      expect(validateEventData({ name: 'Test', id: 'abc123' }, schema).valid).toBe(true);
      expect(validateEventData({ name: 'Test' }, schema).valid).toBe(false);
      expect(validateEventData({}, schema).valid).toBe(false);
    });

    test('validates optional fields', () => {
      const schema = { name: 'name!', description: 'string' };

      expect(validateEventData({ name: 'Test' }, schema).valid).toBe(true);
      expect(validateEventData({ name: 'Test', description: 'Hi' }, schema).valid).toBe(true);
    });

    test('returns error messages', () => {
      const schema = { id: 'id!' };
      const result = validateEventData({}, schema);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required field');
    });
  });
});
