const test = require('node:test');
const assert = require('node:assert/strict');
const { categorize, merchantKey } = require('../.test-build/categorize.js');

test('normalizes merchant keys for rule lookup', () => {
  assert.equal(merchantKey('  Café -- CENTRAL  '), 'café central');
  assert.equal(merchantKey('LOBLAWS!'), 'loblaws');
});

test('classifies common groceries and transit merchants', () => {
  assert.equal(categorize('Loblaws'), 'Groceries');
  assert.equal(categorize('TTC PRESTO'), 'Transport');
});

test('does not force unknown merchants into a guessed category', () => {
  assert.equal(categorize('New Local Store XYZ'), 'Other');
});

test('user merchant overrides take priority over default rules', () => {
  assert.equal(categorize('Loblaws', { loblaws: 'Food & Drinks' }), 'Food & Drinks');
});
