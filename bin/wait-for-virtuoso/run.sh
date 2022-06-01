#!/bin/sh

set -e

D=$(dirname "$0")

echo 'Waiting for Virtuoso'

timeout 30 "${D}/wait-for-virtuoso.sh"

echo 'Virtuoso server is running'
