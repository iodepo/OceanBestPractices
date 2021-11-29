#!/bin/sh

is_elasticsearch_green () {
  curl -s -X GET "http://127.0.0.1:9200/_cluster/health" |\
    grep '"status":"green"' > /dev/null 2>&1
}

while ! is_elasticsearch_green; do sleep 1; done
