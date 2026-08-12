'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Loads a translation table for the given locale, e.g. 'es' -> translations/es.json
 */
function loadTranslationTable(lang) {
  const tablePath = path.join(__dirname, '..', 'translations', `${lang}.json`);
  const raw = fs.readFileSync(tablePath, 'utf8');
  return JSON.parse(raw);
}

function substitutePlaceholders(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in values) return values[key];
    return match;
  });
}

function translateStylelint(diagnostic, table) {
  const rules = table.stylelint || {};
  const translated = rules[diagnostic.code];
  if (translated) return { text: translated, translated: true };

  const fallback = rules._default || '{rule}';
  return {
    text: substitutePlaceholders(fallback, { rule: diagnostic.code }),
    translated: false,
  };
}

function translateVnu(diagnostic, table) {
  const templates = (table.vnu && table.vnu.templates) || [];

  for (const template of templates) {
    const regex = new RegExp(template.pattern);
    const match = diagnostic.message_en.match(regex);
    if (!match) continue;

    const values = {};
    (template.params || []).forEach((paramName, index) => {
      values[index] = match[index + 1];
      values[paramName] = match[index + 1];
    });

    return { text: substitutePlaceholders(template.message, values), translated: true };
  }

  const fallback = (table.vnu && table.vnu._default) || '[sin traducir] {original}';
  return {
    text: substitutePlaceholders(fallback, { original: diagnostic.message_en }),
    translated: false,
  };
}

/**
 * Translates a single normalized diagnostic, returning it augmented with `message_es`.
 * Sets `translated: false` on the diagnostic when the translation fell back to `_default`.
 */
function translateDiagnostic(diagnostic, table) {
  const { text, translated } =
    diagnostic.tool === 'stylelint'
      ? translateStylelint(diagnostic, table)
      : translateVnu(diagnostic, table);

  return { ...diagnostic, message_es: text, translated };
}

module.exports = { loadTranslationTable, translateDiagnostic };
