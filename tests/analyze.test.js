'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { walkDir, matchesIgnore, parseArgs } = require('../src/analyze');

test('parseArgs applies documented defaults', () => {
  const opts = parseArgs([]);
  assert.equal(opts.dir, '.');
  assert.equal(opts.lang, 'es');
  assert.equal(opts.format, 'console');
  assert.equal(opts.failOn, 'error');
  assert.equal(opts.reportUntranslated, false);
});

test('parseArgs reads flags', () => {
  const opts = parseArgs(['--dir', './submissions', '--lang', 'es', '--format', 'md', '--fail-on', 'warning', '--report-untranslated']);
  assert.equal(opts.dir, './submissions');
  assert.equal(opts.format, 'md');
  assert.equal(opts.failOn, 'warning');
  assert.equal(opts.reportUntranslated, true);
});

test('walkDir finds html and css files recursively, skipping node_modules', () => {
  const root = path.join(__dirname, 'fixtures');
  const { htmlFiles, cssFiles } = walkDir(root, []);
  assert.ok(htmlFiles.some((f) => f.endsWith('bad/index.html')));
  assert.ok(cssFiles.some((f) => f.endsWith('good/style.css')));
});

test('matchesIgnore respects glob patterns', () => {
  assert.equal(matchesIgnore('node_modules/foo.css', ['node_modules/**']), true);
  assert.equal(matchesIgnore('src/index.html', ['node_modules/**']), false);
});
