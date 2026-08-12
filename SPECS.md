# SPECS: HTML/CSS Static Analysis with Localized (Spanish) Output

## 1. Goal

Build a pipeline that:

1. Runs static analysis on `.html` and `.css` files (tolerant of malformed markup — student submissions).
2. Translates the resulting diagnostics from English rule codes into maintainable Spanish messages.
3. Runs as a GitHub Action that fails CI when errors are found, posting a translated results table (e.g., as a PR comment or job summary).

Tools used:
- **Nu Html Checker (`vnu-jar`)** for HTML — JSON output, tolerant of broken markup.
- **Stylelint** for CSS — JSON output, rule-based, stable rule IDs.

Both are wrapped by a single Node.js CLI script that normalizes their output into one common report shape, then maps it through a translation table.

---

## 2. Project Structure

```
repo/
├── translations/
│   └── es.json                 # Spanish translation table (see §3)
├── src/
│   ├── analyze.js              # Main batch-runner CLI (see §4)
│   ├── runners/
│   │   ├── html-runner.js      # Wraps vnu-jar
│   │   └── css-runner.js       # Wraps stylelint
│   ├── translate.js            # Loads translation table, maps codes -> messages
│   └── report.js               # Renders Markdown/JSON/console table output
├── .stylelintrc.json           # Stylelint rule config (student-appropriate ruleset)
├── package.json
├── Dockerfile                  # For the GitHub Action (see §5)
├── action.yml                  # GitHub Action metadata (see §5)
└── SPECS.md
```

---

## 3. Translation Table

### 3.1 Design principle

Do **not** try to translate free-form English sentences (v.Nu in particular embeds dynamic details like tag names/line content directly in the message string, which makes exact string-matching fragile). Instead:

- For **Stylelint**: map by **rule ID** (e.g. `color-no-invalid-hex`, `block-no-empty`). Rule IDs are stable, finite, and documented. Stylelint JSON output includes `rule` per warning — perfect translation key.
- For **v.Nu (HTML)**: v.Nu does not expose a stable "rule code" the way Stylelint does — messages are natural language and somewhat templated. Two options, in order of preference:
  1. **Pattern-key approach**: normalize each message into a template key by stripping variable parts (tag names, attribute names, line snippets) via regex, then use the *template* as the translation key, with placeholders substituted back in at render time (e.g. `Element "{tag}" not allowed as child of element "{parent}" in this context.`).
  2. **Fallback pass-through**: if no template matches, fall back to the original English message prefixed with `[sin traducir]` so nothing is silently dropped, and log it so the table can be extended.

This keeps the table maintainable by non-developers (just JSON key/value edits) while staying robust against v.Nu's free-text messages.

### 3.2 File format — `translations/es.json`

```json
{
  "meta": {
    "locale": "es",
    "updated": "2026-08-11"
  },
  "stylelint": {
    "color-no-invalid-hex": "El color hexadecimal no es válido.",
    "block-no-empty": "El bloque de reglas está vacío.",
    "unit-no-unknown": "Unidad de medida desconocida: \"{unit}\".",
    "_default": "Error de estilo CSS: {rule}."
  },
  "vnu": {
    "templates": [
      {
        "pattern": "^Element “(.+?)” not allowed as child of element “(.+?)” in this context\\.",
        "message": "El elemento «{0}» no está permitido dentro del elemento «{1}» en este contexto.",
        "params": ["tag", "parent"]
      },
      {
        "pattern": "^Stray end tag “(.+?)”\\.",
        "message": "Etiqueta de cierre suelta: «{0}».",
        "params": ["tag"]
      },
      {
        "pattern": "^Attribute “(.+?)” not allowed on element “(.+?)” at this point\\.",
        "message": "El atributo «{0}» no está permitido en el elemento «{1}» en este punto.",
        "params": ["attr", "tag"]
      },
      {
        "pattern": "^Duplicate ID “(.+?)”\\.",
        "message": "ID duplicado: «{0}».",
        "params": ["id"]
      }
    ],
    "_default": "[sin traducir] {original}"
  }
}
```

Notes:
- `_default` is the fallback for any rule/pattern not yet catalogued — guarantees the tool never crashes on an unmapped code, and makes gaps visible in the output (so the table can be grown incrementally as new patterns are seen).
- `params` map regex capture groups positionally into the translated string via `{0}`, `{1}`, ... placeholders.
- Table is plain JSON — no build step, human-editable, diff-friendly in git, and a non-developer (e.g. a TA) can extend it directly.

### 3.3 Maintenance workflow

1. Run the analyzer with `--report-untranslated` (see §4.4) to collect any message that fell through to `_default`.
2. Add a new entry (rule ID for Stylelint, or pattern+template for v.Nu) to `translations/es.json`.
3. Commit — no code changes needed.

---

## 4. Node Batch Script (`src/analyze.js`)

### 4.1 Responsibilities

- Accept a target folder (recursively scan for `*.html` and `*.css`).
- Run `vnu-jar` against all HTML files (via its JSON output mode).
- Run `stylelint` against all CSS files (via its JSON formatter).
- Normalize both outputs into one common shape:

```json
{
  "file": "student1/index.html",
  "tool": "vnu",
  "type": "error",
  "line": 12,
  "column": 5,
  "code": "vnu:duplicate-id",
  "message_en": "Duplicate ID “nav”.",
  "message_es": "ID duplicado: «nav»."
}
```

- Pass each normalized message through `translate.js`.
- Emit a report (see §4.3) and a process exit code (`0` if no errors, `1` if any `type: "error"` entries exist — configurable to also fail on warnings via `--fail-on warning`).

### 4.2 CLI usage

```bash
node src/analyze.js --dir ./submissions --lang es --format md --fail-on error > report.md
```

Flags:
| Flag | Description | Default |
|---|---|---|
| `--dir` | Root folder to scan | `.` |
| `--lang` | Translation table to use (`translations/<lang>.json`) | `es` |
| `--format` | `md`, `json`, or `console` | `console` |
| `--fail-on` | `error` or `warning` | `error` |
| `--report-untranslated` | Also dump a list of messages that hit `_default` | off |
| `--ignore` | Glob(s) to exclude (e.g. `node_modules/**`) | none |

### 4.3 Report formats

- **`console`**: human-readable table via a lightweight table-printing lib (e.g. `cli-table3`), grouped by file.
- **`md`**: GitHub-flavored Markdown table — this is what the Action posts to the job summary / PR comment:

```markdown
| Archivo | Línea | Herramienta | Mensaje |
|---|---|---|---|
| submissions/ana/index.html | 12 | HTML | ID duplicado: «nav». |
| submissions/ana/style.css | 4 | CSS | El bloque de reglas está vacío. |
```

- **`json`**: raw structured output for programmatic consumption / future dashboards.

### 4.4 Implementation notes

- Use `vnu-jar` via its **JSON output mode** (`java -jar vnu.jar --format json --exit-zero-always file1.html file2.html ...`), so a single JVM invocation can batch multiple files (avoids one JVM boot per file — important for performance with many student submissions).
- Use Stylelint's **Node API** directly (`const stylelint = require('stylelint'); stylelint.lint({files, formatter: 'json'})`) rather than shelling out, for speed and to keep everything in one process.
- Wrap both runners in try/catch — a single malformed file must not crash the whole batch; log a per-file "could not parse" entry instead and continue.
- Since student files can be badly broken, ensure:
  - `vnu-jar` is **not** run in `--exit-zero-always`-less mode (which would abort on fatal parse errors) — always pass `--exit-zero-always` so batch continues across files.
  - Stylelint config disables any rule that would throw on completely invalid CSS; rely on its default resilient parser (`postcss-safe-parser` can be swapped in via `customSyntax` for maximum tolerance of broken CSS).

---

## 5. GitHub Action

### 5.1 Files

- **`Dockerfile`**: container with Node.js + JRE (v.Nu needs Java) + the script + default translation table baked in.
- **`action.yml`**: declares the Action's inputs/outputs and points to the Dockerfile.
- **`entrypoint.sh`**: thin wrapper that runs `analyze.js` with inputs mapped from Action `with:` parameters, and pipes Markdown output into `$GITHUB_STEP_SUMMARY`.

### 5.2 `action.yml` (sketch)

```yaml
name: "HTML/CSS Static Analysis (ES)"
description: "Lints student HTML/CSS submissions and reports errors in Spanish"
inputs:
  path:
    description: "Folder to scan"
    required: false
    default: "."
  fail-on:
    description: "error | warning"
    required: false
    default: "error"
  lang:
    description: "Translation table locale"
    required: false
    default: "es"
runs:
  using: "docker"
  image: "Dockerfile"
  args:
    - ${{ inputs.path }}
    - ${{ inputs.fail-on }}
    - ${{ inputs.lang }}
```

### 5.3 `Dockerfile` (sketch)

```dockerfile
FROM node:20-slim

# vnu-jar needs a JRE
RUN apt-get update && apt-get install -y --no-install-recommends default-jre-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /action
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY translations ./translations
COPY .stylelintrc.json ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
```

### 5.4 `entrypoint.sh` (sketch)

```bash
#!/bin/sh
set -e
TARGET_DIR="$1"
FAIL_ON="$2"
LANG_CODE="$3"

node src/analyze.js \
  --dir "$TARGET_DIR" \
  --lang "$LANG_CODE" \
  --format md \
  --fail-on "$FAIL_ON" \
  --report-untranslated > report.md

# Post to the workflow's job summary (renders as a nice table in the GH UI)
cat report.md >> "$GITHUB_STEP_SUMMARY"

# Preserve exit code from analyze.js to fail the job
exit $?
```

Note: `analyze.js` must set its own `process.exitCode` (1 on errors found, per `--fail-on`), and the shell script above needs `set -e` handled carefully — capture the exit code of the `node` command explicitly (before piping) rather than relying on the pipeline's overall status, since piping into `>>` after `>` masks it. Recommended fix: write report to a temp file with `node ... > report.md; STATUS=$?` then `cat report.md >> $GITHUB_STEP_SUMMARY; exit $STATUS`.

### 5.5 Consumer workflow (in the student repo)

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
          path: "."
          fail-on: "error"
          lang: "es"
```

Result: PRs get a red ❌ check when errors are found, and the **Job Summary** tab shows the translated Markdown table — no extra PR-comment bot/token setup required for the MVP. (A PR-comment version can be added later using `actions/github-script` + `GITHUB_TOKEN`, listed as a stretch goal below.)

---

## 6. Build Steps (in order)

1. **Scaffold repo**: `package.json`, install `stylelint`, `vnu-jar` (npm package), `cli-table3`, `minimist` (arg parsing).
2. **Write `translations/es.json`** with an initial small set of the most common Stylelint rules + a handful of v.Nu templates (grow iteratively via `--report-untranslated`).
3. **Write `runners/html-runner.js`**: shells out to `vnu-jar` (via the npm-packaged jar path) with `--format json --exit-zero-always`, parses stdout JSON.
4. **Write `runners/css-runner.js`**: calls Stylelint's Node API with `formatter: 'json'`.
5. **Write `translate.js`**: given a normalized message object, looks up Stylelint rule ID directly; for v.Nu, iterates `vnu.templates` regexes until first match, substitutes params, else falls back to `_default`.
6. **Write `report.js`**: renders `console` / `md` / `json` outputs from the normalized+translated list.
7. **Write `analyze.js`**: wires it all together — walk directory, dispatch by extension, aggregate, translate, report, set exit code.
8. **Test locally** against a folder of intentionally-broken sample HTML/CSS files (unclosed tags, invalid hex colors, missing quotes, duplicate IDs, etc.) to validate both the tolerant parsing and the translation coverage.
9. **Write `Dockerfile` + `action.yml` + `entrypoint.sh`**.
10. **Test the Action** in a scratch repo using `uses: ./` (local action reference) before publishing/tagging `v1`.
11. **Tag a release** (`v1`) so consumer repos can pin `your-org/html-css-lint-es@v1`.

---

## 7. Stretch Goals (not required for MVP)

- Post results as a **PR review comment** (inline, per-line) instead of only the job summary, using `actions/github-script`.
- Support additional locales by dropping in another `translations/<lang>.json` — no code changes.
- Cache the `vnu.jar` layer in the Docker image build to speed up Action cold-starts.
- Add a `--severity-threshold` (e.g., allow N warnings before failing) for gradual rollout across a class.
