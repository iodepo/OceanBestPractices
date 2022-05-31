#!/bin/sh

is_virtuoso_online () {
  nc -v -z 127.0.0.1 1111 2>&1 |\
    grep succeeded > /dev/null 2>&1
}

while ! is_virtuoso_online; do sleep 1; done
