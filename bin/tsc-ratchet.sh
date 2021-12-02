#!/bin/sh

set -e

mkdir -p tmp

npx tsc --noEmit | tee tmp/tsc.log

PROBLEMS=$(grep -c 'error TS\d' tmp/tsc.log)

[ -z "$PROBLEMS" ] && exit 0

RATCHET=$(cat .tsc-ratchet)

if [ "$PROBLEMS" -gt "$RATCHET" ]; then
  echo "tsc errors increased from ${RATCHET} to ${PROBLEMS}." >&2
  exit 1
fi

if [ "$PROBLEMS" -lt "$RATCHET" ]; then
  if [ "$CI" = "true" ]; then
    echo "tsc errors decreased from ${RATCHET} to ${PROBLEMS}, but .tsc-ratchet was not updated." >&2
    exit 1
  else
    echo "tsc errors decreased from ${RATCHET} to ${PROBLEMS}. Ratcheting down."
    echo "$PROBLEMS" > .tsc-ratchet
  fi
fi
