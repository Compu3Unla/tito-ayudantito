# html-css-lint-es

Static analysis for student HTML/CSS submissions, with diagnostics translated into Spanish. Tolerant of malformed markup, runnable locally as a CLI or as a GitHub Action that fails CI and posts a translated results table to the job summary.

- **HTML** via [`vnu-jar`](https://github.com/validator/validator) (the Nu Html Checker) — tolerant of broken markup.
- **CSS** via [Stylelint](https://stylelint.io/) with `postcss-safe-parser` — tolerant of invalid CSS.
- Diagnostics are normalized into one shape and translated through a maintainable, human-editable JSON table (`translations/es.json`).

## Requirements

- Node.js 20+
- A JRE (Java 8+) on `PATH` — required by `vnu-jar` for HTML checking. Not needed if you only lint CSS.

## Install

```bash
npm install
```

## CLI usage

```bash
node src/analyze.js --dir ./submissions --lang es --format md --fail-on error > report.md
```

| Flag | Description | Default |
|---|---|---|
| `--dir` | Root folder to scan recursively for `.html`/`.css` | `.` |
| `--lang` | Translation table to use (`translations/<lang>.json`) | `es` |
| `--format` | Output format: `md`, `json`, or `console` | `console` |
| `--fail-on` | Exit non-zero when `error` diagnostics exist, or also on `warning` | `error` |
| `--report-untranslated` | Print (to stderr) any message that fell back to `_default`, so the translation table can be extended | off |
| `--ignore` | Glob(s) to exclude, e.g. `node_modules/**` (repeatable) | none |

Exit code is `0` when nothing at or above the `--fail-on` severity is found, `1` otherwise.

### Examples

```bash
# Human-readable table in the terminal
node src/analyze.js --dir ./submissions

# Markdown report, failing on warnings too
node src/analyze.js --dir ./submissions --format md --fail-on warning > report.md

# Raw JSON for further processing
node src/analyze.js --dir ./submissions --format json > report.json
```

## Extending the translation table

Rule/pattern coverage lives entirely in `translations/es.json` — no code changes needed:

1. Run with `--report-untranslated` to see which messages fell back to `_default`.
2. For **Stylelint**, add an entry under `"stylelint"` keyed by the rule ID (e.g. `"unit-no-unknown"`).
3. For **v.Nu**, add a `{ "pattern", "message", "params" }` entry under `"vnu.templates"` — `pattern` is a regex matched against the English message, capture groups are substituted positionally into `message` via `{0}`, `{1}`, ... (and by name, via `params`).
4. Commit the JSON file.

Additional locales can be added the same way by creating `translations/<lang>.json` and passing `--lang <lang>`.

## Running as a GitHub Action

This repo is itself a Docker-based GitHub Action. In a consumer repo:

```yaml
name: Lint HTML/CSS
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run HTML/CSS analysis
        uses: your-org/html-css-lint-es@v1
        with:
          path: "."          # folder to scan, default "."
          fail-on: "error"    # "error" or "warning", default "error"
          lang: "es"          # translation table locale, default "es"
```

The job fails when diagnostics at or above `fail-on` severity are found, and the translated Markdown table is written to the workflow's **Job Summary** — no extra token or PR-comment bot setup required.

See [.github/workflows/lint.yml](.github/workflows/lint.yml) for a self-test example in this repo.

### Publishing a version

Consumer repos pin a tag (`@v1`), so after making changes:

```bash
git tag -f v1
git push -f origin v1
```

## Development

```bash
npm test          # unit tests (translate.js, report.js, analyze.js helpers)
npm run analyze -- --dir tests/fixtures/bad --format md   # smoke test against intentionally-broken fixtures
```

`tests/fixtures/good` and `tests/fixtures/bad` contain sample HTML/CSS used both by the unit tests and for manually sanity-checking new translation entries.

### Building/testing the Docker image locally

```bash
docker build -t html-css-lint-es .
docker run --rm -v "$PWD/tests/fixtures":/action/tests/fixtures html-css-lint-es tests/fixtures/bad error es
```

## Project layout

```
translations/es.json   # Spanish translation table
src/analyze.js          # CLI entrypoint: walk dir, run tools, translate, report, set exit code
src/runners/html-runner.js   # wraps vnu-jar (batched, single JVM invocation)
src/runners/css-runner.js    # wraps Stylelint's Node API
src/translate.js        # loads translation table, maps diagnostics -> Spanish
src/report.js           # renders console / md / json output
.stylelintrc.json       # student-appropriate Stylelint ruleset
Dockerfile, action.yml, entrypoint.sh   # GitHub Action packaging
```

## Stretch goals (not implemented)

- Post results as an inline PR review comment via `actions/github-script`.
- `--severity-threshold` to allow N warnings before failing.
- Cache the `vnu.jar` layer to speed up Action cold-starts.
