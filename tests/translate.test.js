'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTranslationTable, translateDiagnostic } = require('../src/translate');

const table = loadTranslationTable('es');

test('translates a known stylelint rule', () => {
  const result = translateDiagnostic(
    { tool: 'stylelint', code: 'block-no-empty', message_en: 'Unexpected empty block' },
    table
  );
  assert.equal(result.message_es, 'El bloque de reglas está vacío.');
  assert.equal(result.translated, true);
});

test('falls back to _default for an unknown stylelint rule', () => {
  const result = translateDiagnostic(
    { tool: 'stylelint', code: 'made-up-rule', message_en: 'whatever' },
    table
  );
  assert.equal(result.message_es, 'Error de estilo CSS: made-up-rule.');
  assert.equal(result.translated, false);
});

test('translates a known vnu pattern with param substitution', () => {
  const result = translateDiagnostic(
    { tool: 'vnu', code: 'vnu:error', message_en: 'Duplicate ID “nav”.' },
    table
  );
  assert.equal(result.message_es, 'ID duplicado: «nav».');
  assert.equal(result.translated, true);
});

test('falls back to [sin traducir] for an unmatched vnu message', () => {
  const result = translateDiagnostic(
    { tool: 'vnu', code: 'vnu:error', message_en: 'Something totally unrecognized.' },
    table
  );
  assert.equal(result.message_es, '[sin traducir] Something totally unrecognized.');
  assert.equal(result.translated, false);
});
