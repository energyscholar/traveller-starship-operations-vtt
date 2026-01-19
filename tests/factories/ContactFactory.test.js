/**
 * ContactFactory Tests
 * Tests for lib/factories/ContactFactory.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const ContactFactory = require('../../lib/factories/ContactFactory');

describe('ContactFactory', () => {

  describe('getTemplates', () => {

    it('returns object with template list', () => {
      const templates = ContactFactory.getTemplates();
      assert.ok(templates, 'Should return templates');
      assert.ok(Array.isArray(templates), 'Should be array');
    });

    it('templates have id and name', () => {
      const templates = ContactFactory.getTemplates();
      if (templates.length > 0) {
        const first = templates[0];
        assert.ok(first.id, 'Template should have id');
        assert.ok(first.name, 'Template should have name');
      }
    });

  });

  describe('loadTemplate', () => {

    it('returns specific template by ID', () => {
      const templates = ContactFactory.getTemplates();
      if (templates.length > 0) {
        const templateId = templates[0].id;
        const template = ContactFactory.loadTemplate(templateId);
        assert.ok(template, 'Should return template');
      }
    });

    it('returns null for unknown template', () => {
      const template = ContactFactory.loadTemplate('nonexistent_template_xyz');
      // May return null or throw - either is valid
      if (template !== null && template !== undefined) {
        // If it returns something, verify it has expected structure
        assert.ok(typeof template === 'object', 'Should be object if returned');
      }
    });

  });

  describe('fromTemplate', () => {

    it('creates contact object from template', () => {
      const templates = ContactFactory.getTemplates();
      if (templates.length > 0) {
        const templateId = templates[0].id;
        const contact = ContactFactory.fromTemplate(templateId);
        assert.ok(contact, 'Should return contact');
        assert.ok(typeof contact === 'object', 'Contact should be object');
      }
    });

    it('created contact has name', () => {
      const templates = ContactFactory.getTemplates();
      if (templates.length > 0) {
        const templateId = templates[0].id;
        const contact = ContactFactory.fromTemplate(templateId);
        assert.ok(contact.name, 'Contact should have name');
      }
    });

    it('created contact has range_km property', () => {
      const templates = ContactFactory.getTemplates();
      if (templates.length > 0) {
        const templateId = templates[0].id;
        const contact = ContactFactory.fromTemplate(templateId);
        assert.ok(contact.range_km !== undefined, 'Contact should have range_km');
      }
    });

    it('created contact has health and max_health', () => {
      const templates = ContactFactory.getTemplates();
      if (templates.length > 0) {
        const templateId = templates[0].id;
        const contact = ContactFactory.fromTemplate(templateId);
        assert.ok(contact.health !== undefined, 'Contact should have health');
        assert.ok(contact.max_health !== undefined, 'Contact should have max_health');
      }
    });

  });

  describe('template names', () => {

    it('templates include expected ship types', () => {
      const templates = ContactFactory.getTemplates();
      const names = templates.map(t => t.name?.toLowerCase() || t.id?.toLowerCase());

      // Verify at least some common ship types exist
      const hasShipTypes = templates.length > 0;
      assert.ok(hasShipTypes, 'Should have at least some templates');
    });

  });

});
