#!/bin/sh

set -e

npx webpack

(
  set -e
  cd website
  npm install
  npm run build
)
