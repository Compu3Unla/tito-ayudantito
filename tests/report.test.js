'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderReport } = require('../src/report');

const diagnostics = [
  { file: 'a.html', tool: 'vnu', line: 3, message_es: 'ID duplicado: «nav».' },
  { file: 'b.css', tool: 'stylelint', line: 1, message_es: 'El bloque de reglas está vacío.' },
];

test('renders a markdown table', () => {
  const md = renderReport(diagnostics, 'md');
  assert.match(md, /\| Archivo \| Línea \| Herramienta \| Mensaje \|/);
  assert.match(md, /a\.html/);
  assert.match(md, /ID duplicado/);
});

test('renders valid JSON', () => {
  const json = renderReport(diagnostics, 'json');
  const parsed = JSON.parse(json);
  assert.equal(parsed.length, 2);
});

test('renders a friendly empty-state message', () => {
  assert.match(renderReport([], 'md'), /No se encontraron problemas/);
  assert.equal(renderReport([], 'json'), '[]');
});
