#!/bin/sh

set -e

rm -rf dist
npx webpack

(
  set -e
  cd website
  npm install
  npm run build
)
