#!/bin/sh

set -e

mkdir -p tmp

npx eslint . --ext .js,.jsx,.ts,.tsx | tee tmp/eslint.log

PROBLEMS=$(grep -E '^✖ \d+ problems' tmp/eslint.log | awk '{print $2}')

[ -z "$PROBLEMS" ] && exit 0

RATCHET=$(cat .eslint-ratchet)

if [ "$PROBLEMS" -gt "$RATCHET" ]; then
  echo "eslint problems increased from ${RATCHET} to ${PROBLEMS}." >&2
  exit 1
fi

if [ "$PROBLEMS" -lt "$RATCHET" ]; then
  if [ "$CI" = "true" ]; then
    echo "eslint problems decreased from ${RATCHET} to ${PROBLEMS}, but .eslint-ratchet was not updated." >&2
    exit 1
  else
    echo "eslint problems decreased from ${RATCHET} to ${PROBLEMS}. Ratcheting down."
    echo "$PROBLEMS" > .eslint-ratchet
  fi
fi
