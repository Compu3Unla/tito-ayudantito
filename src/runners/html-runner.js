'use strict';

const { execFile } = require('node:child_process');
const vnuJarPath = require('vnu-jar');

/**
 * Runs vnu-jar against a batch of HTML files in a single JVM invocation.
 * @param {string[]} files
 * @returns {Promise<Array>} normalized diagnostics ({file, tool, type, line, column, code, message_en})
 */
function runHtmlRunner(files) {
  return new Promise((resolve) => {
    if (files.length === 0) return resolve([]);

    const args = ['-jar', vnuJarPath, '--format', 'json', '--exit-zero-always', ...files];

    execFile('java', args, { maxBuffer: 1024 * 1024 * 64 }, (_err, _stdout, stderr) => {
      // vnu-jar writes its JSON report to stderr, not stdout.
      if (!stderr) return resolve([]);

      let parsed;
      try {
        parsed = JSON.parse(stderr);
      } catch {
        return resolve(
          files.map((file) => ({
            file,
            tool: 'vnu',
            type: 'error',
            line: null,
            column: null,
            code: 'vnu:parse-failure',
            message_en: 'Could not parse vnu-jar output for this batch.',
          }))
        );
      }

      const messages = (parsed.messages || []).map((m) => ({
        file: m.url ? m.url.replace(/^file:/, '') : 'unknown',
        tool: 'vnu',
        type: m.type === 'info' ? 'warning' : m.type,
        line: m.lastLine ?? null,
        column: m.lastColumn ?? null,
        code: `vnu:${(m.subType || m.type || 'message')}`,
        message_en: m.message,
      }));

      resolve(messages);
    });
  });
}

module.exports = { runHtmlRunner };
