#!/bin/sh

set -e

(
  set -e
  cd ingest/lambdas/scheduler
  rm -rf node_modules
  npm ci --production
)

(
  set -e
  cd website
  npm install
  npm run build
)
