#!/bin/sh

set -e

rm -rf dist
npx webpack

mkdir -p ./neptune-bulk-loader/docker/dist/
cp ./dist/neptune-bulk-loader/task/index.js* ./neptune-bulk-loader/docker/dist/

(
  set -e
  cd website
  npm install
  npm run build
)
