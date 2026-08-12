#!/bin/sh
set -e

TARGET_DIR="$1"
FAIL_ON="$2"
LANG_CODE="$3"

set +e
node src/analyze.js \
  --dir "$TARGET_DIR" \
  --lang "$LANG_CODE" \
  --format md \
  --fail-on "$FAIL_ON" \
  --report-untranslated > report.md
STATUS=$?
set -e

if [ -n "$GITHUB_STEP_SUMMARY" ]; then
  cat report.md >> "$GITHUB_STEP_SUMMARY"
else
  cat report.md
fi

exit $STATUS
