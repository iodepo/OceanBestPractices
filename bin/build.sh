#!/bin/sh

set -e

(
  set -e
  cd ingest/lambdas/scheduler
  npm install
)
