'use strict';

const Table = require('cli-table3');

function escapeMdCell(text) {
  return String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function toConsole(diagnostics) {
  const table = new Table({ head: ['Archivo', 'Línea', 'Herramienta', 'Mensaje'] });
  for (const d of diagnostics) {
    table.push([d.file, d.line ?? '-', d.tool.toUpperCase(), d.message_es]);
  }
  return table.toString();
}

function toMarkdown(diagnostics) {
  const header = '| Archivo | Línea | Herramienta | Mensaje |\n|---|---|---|---|';
  const rows = diagnostics.map(
    (d) =>
      `| ${escapeMdCell(d.file)} | ${d.line ?? '-'} | ${d.tool.toUpperCase()} | ${escapeMdCell(d.message_es)} |`
  );
  return [header, ...rows].join('\n') + '\n';
}

function toJson(diagnostics) {
  return JSON.stringify(diagnostics, null, 2);
}

/**
 * Renders a list of translated diagnostics as console/md/json.
 */
function renderReport(diagnostics, format) {
  if (diagnostics.length === 0) {
    if (format === 'json') return '[]';
    if (format === 'md') return 'No se encontraron problemas. ✅\n';
    return 'No se encontraron problemas.';
  }

  if (format === 'json') return toJson(diagnostics);
  if (format === 'md') return toMarkdown(diagnostics);
  return toConsole(diagnostics);
}

module.exports = { renderReport };
