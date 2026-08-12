'use strict';

const stylelint = require('stylelint');

/**
 * Runs Stylelint against a batch of CSS files via its Node API.
 * @param {string[]} files
 * @param {string} configFile
 * @returns {Promise<Array>} normalized diagnostics
 */
async function runCssRunner(files, configFile) {
  if (files.length === 0) return [];

  try {
    const { results } = await stylelint.lint({
      files,
      configFile,
      customSyntax: 'postcss-safe-parser',
      formatter: 'json',
    });

    const diagnostics = [];
    for (const result of results) {
      if (result.parseErrors && result.parseErrors.length > 0) {
        for (const parseError of result.parseErrors) {
          diagnostics.push({
            file: result.source,
            tool: 'stylelint',
            type: 'error',
            line: parseError.line ?? null,
            column: parseError.column ?? null,
            code: 'stylelint:parse-error',
            message_en: parseError.text,
          });
        }
      }

      for (const warning of result.warnings) {
        diagnostics.push({
          file: result.source,
          tool: 'stylelint',
          type: warning.severity === 'error' ? 'error' : 'warning',
          line: warning.line ?? null,
          column: warning.column ?? null,
          code: warning.rule || 'stylelint:unknown',
          message_en: warning.text,
        });
      }
    }
    return diagnostics;
  } catch (err) {
    return files.map((file) => ({
      file,
      tool: 'stylelint',
      type: 'error',
      line: null,
      column: null,
      code: 'stylelint:runner-failure',
      message_en: `Could not lint this file: ${err.message}`,
    }));
  }
}

module.exports = { runCssRunner };
